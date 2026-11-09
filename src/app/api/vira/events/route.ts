import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyViraRequest, queueViraCall, queueViraProgress } from '@/lib/vira'

export const dynamic = 'force-dynamic'

// POST /api/vira/events — webhook จาก Vira (สาธารณะใน middleware; ตรวจ Bearer + HMAC เอง)
// รองรับ: case.handoff / case.cancelled (ทะเบียนเรื่อง Support) · request.handoff / request.cancelled (ฝ่ายการตลาด)
//         team.handoff (แชท) — ยังไม่มีหน้าแชท: บันทึกเป็นแจ้งปัญหาไว้ให้ทีมเห็น แล้วคืนแชทให้ Support ดูแลต่อ
// เหตุการณ์อื่นตอบ 200 แล้วข้าม · event_id ซ้ำตอบ 200 ไม่ทำซ้ำ · ประมวลผลไม่ได้ตอบ 500 ให้ Vira ส่งซ้ำ
type Obj = Record<string, unknown>
const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const o = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const date = (v: unknown) => { const d = typeof v === 'string' ? new Date(v) : null; return d && !isNaN(d.getTime()) ? d : null }

export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyViraRequest(req.headers, raw)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Obj
  try { body = o(JSON.parse(raw)) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const eventId = s(body.event_id, 100)
  const event = s(body.event, 60)
  if (!eventId || !event) return NextResponse.json({ error: 'event and event_id required' }, { status: 400 })

  const after: (() => Promise<void>)[] = []
  try {
    await prisma.$transaction(async (tx) => {
      // บันทึก event ก่อน — ถ้าซ้ำ (P2002) จะถูกจับด้านล่างแล้วตอบ 200
      await tx.viraEvent.create({ data: { id: eventId, event, occurredAt: date(body.occurred_at), payload: body as Prisma.InputJsonValue } })

      if (event === 'case.handoff') {
        const handoffId = s(body.handoff_id, 100)
        const c = o(body.case)
        if (!handoffId || await tx.issue.findUnique({ where: { viraRef: handoffId }, select: { id: true } })) return
        const hospital = o(c.hospital), contact = o(c.contact)
        const question = s(c.question, 1000) || s(body.note, 1000) || 'เรื่องจาก Support Center'
        await tx.issue.create({
          data: {
            issueType: 'GENERAL', status: 'RECEIVED', title: question.slice(0, 300),
            hospitalName: s(hospital.name, 200) || null,
            viraKind: 'case', viraRef: handoffId,
            viraInfo: {
              source: 'Support Center', caseId: c.id ?? null, ask: s(body.note, 2000), sentBy: s(body.sent_by, 100),
              severity: s(c.severity, 20), channel: s(c.channel, 30), hospcode: s(hospital.hospcode, 10),
              contactName: s(contact.name, 100), contactPhone: s(contact.phone, 30), caseNote: s(c.note, 1000),
              processes: Array.isArray(c.processes) ? c.processes.slice(-10).map((p) => ({ at: s(o(p).at, 40), by: s(o(p).by, 100), detail: s(o(p).detail, 1000) })) : [],
            },
            events: { create: { type: 'CREATED', note: `รับเรื่องจาก Vira · Support Center${c.id ? ` · เรื่องเลขที่ ${c.id}` : ''}${body.sent_by ? ` · ส่งโดย ${s(body.sent_by, 100)}` : ''}`, actorName: 'Vira' } },
          },
        })
        return
      }

      if (event === 'request.handoff') {
        const r = o(body.request)
        const requestId = s(r.request_id, 100)
        if (!requestId || await tx.issue.findUnique({ where: { viraRef: requestId }, select: { id: true } })) return
        const hospital = o(r.hospital), contact = o(r.contact)
        await tx.issue.create({
          data: {
            issueType: 'GENERAL', status: 'RECEIVED', title: (s(r.question, 1000) || 'เรื่องจากฝ่ายการตลาด').slice(0, 300),
            hospitalName: s(hospital.name, 200) || null,
            viraKind: 'request', viraRef: requestId,
            viraInfo: {
              source: 'ฝ่ายการตลาด (Lumi)', caseId: s(r.lumi_ref, 50), ask: s(r.note, 2000), sentBy: s(r.received_by, 100),
              channel: s(r.channel, 30), hospcode: s(hospital.hospcode, 10), contactName: s(contact.name, 100), contactPhone: s(contact.phone, 30),
              refUrl: s(r.ref_url, 300),
            },
            events: { create: { type: 'CREATED', note: `รับเรื่องจาก Vira · ฝ่ายการตลาด${r.lumi_ref ? ` · ${s(r.lumi_ref, 50)}` : ''}${r.received_by ? ` · ฝ่ายขาย ${s(r.received_by, 100)}` : ''}`, actorName: 'Vira' } },
          },
        })
        return
      }

      if (event === 'case.cancelled' || event === 'request.cancelled') {
        const ref = s(event === 'case.cancelled' ? body.handoff_id : body.request_id, 100)
        const issue = ref ? await tx.issue.findUnique({ where: { viraRef: ref }, select: { id: true, status: true } }) : null
        if (!issue) return
        const reason = s(body.reason, 500)
        await tx.issue.update({
          where: { id: issue.id },
          data: {
            viraClosedAt: new Date(),
            ...(issue.status !== 'DONE' ? { status: 'REJECTED' as const } : {}),
            events: { create: { type: issue.status !== 'DONE' ? 'STATUS_CHANGED' : 'SOLUTION_UPDATED', fromStatus: issue.status, toStatus: issue.status !== 'DONE' ? 'REJECTED' : issue.status, note: `ยกเลิกจากต้นทาง${reason ? `: ${reason}` : ''}${body.by ? ` (${s(body.by, 100)})` : ''}`, actorName: 'Vira' } },
          },
        })
        return
      }

      if (event === 'team.handoff') {
        // ยังไม่มีหน้าแชทของทีม: ลงเป็นแจ้งปัญหาให้ทีมเห็น แล้วคืนแชทให้ Support (ลูกค้าไม่ค้างกับทีมที่ตอบแชทไม่ได้)
        const h = o(body.handoff), customer = o(body.customer), contact = o(body.contact)
        const handoffId = s(h.handoff_id, 100)
        if (!handoffId || await tx.issue.findUnique({ where: { viraRef: handoffId }, select: { id: true } })) return
        const summary = s(h.summary, 500) || 'แชทจากลูกค้า'
        const msgs = Array.isArray(h.messages) ? h.messages.slice(-20).map((m) => `${s(o(m).from, 20)}: ${s(o(m).text, 500)}`).join('\n') : ''
        const issue = await tx.issue.create({
          data: {
            issueType: 'GENERAL', status: 'RECEIVED', title: summary.slice(0, 300),
            hospitalName: s(contact.org_name, 200) || null,
            viraKind: 'chat', viraRef: handoffId, viraClosedAt: new Date(),
            viraInfo: {
              source: `แชท ${s(body.channel, 20)} (ส่งมาจาก ${s(h.from, 20)})`, ask: summary, sentBy: s(h.staff_name, 100),
              hospcode: s(contact.hospital_code, 10), contactName: [s(contact.first_name, 50), s(contact.last_name, 50)].filter(Boolean).join(' ') || s(customer.display_name, 100),
              contactPhone: s(contact.phone, 30), chat: msgs.slice(0, 6000),
            },
            events: { create: { type: 'CREATED', note: `แชทจาก Vira (${s(h.from, 20)}) — ระบบยังไม่รองรับแชท จึงคืนแชทให้ Support ดูแลต่อ`, actorName: 'Vira' } },
          },
          select: { id: true },
        })
        const customerId = s(customer.id, 200)
        if (customerId) {
          after.push(() => queueViraCall('/api/team/transfer', {
            customer_id: customerId, to: 'support', ref: `KI-chat-${handoffId}`.slice(0, 100), notify_customer: true,
            summary: `ทีม Kiosk ยังไม่รองรับการตอบแชทผ่าน Vira · บันทึกเรื่องไว้แล้ว ทีมจะติดต่อกลับทางโทรศัพท์ — ฝาก Support ดูแลแชทต่อ: ${summary}`.slice(0, 500),
          }, issue.id))
        }
        return
      }
      // เหตุการณ์อื่น (team.message, team.resolved, team.closed, contact.registered, …) เก็บไว้เฉย ๆ
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ ok: true, duplicate: true })
    console.error('[vira] event failed', event, eventId, e)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  for (const fn of after) await fn().catch((e) => console.error('[vira] queue failed', e))
  // case/request ใหม่: แจ้ง Vira ทันทีว่าเข้าระบบทีมแล้ว (สถานะ received)
  if (event === 'case.handoff' || event === 'request.handoff') {
    const ref = event === 'case.handoff' ? s(body.handoff_id, 100) : s(o(body.request).request_id, 100)
    const issue = ref ? await prisma.issue.findUnique({ where: { viraRef: ref }, select: { id: true } }) : null
    if (issue) await queueViraProgress(issue.id).catch((e) => console.error('[vira] progress failed', e))
  }
  return NextResponse.json({ ok: true })
}
