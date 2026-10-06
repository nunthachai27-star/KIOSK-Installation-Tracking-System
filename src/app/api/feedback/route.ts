import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { str, reqIp } from '@/lib/kioskProductServer'
import { pushLine } from '@/lib/lineNotify'

export const dynamic = 'force-dynamic'

const RATE_MAX = 10
const RATE_WINDOW_MS = 3600_000
const SOURCES = new Set(['fat', 'bp', 'other'])
const SRC_LABEL: Record<string, string> = { fat: 'เครื่องวัดไขมัน', bp: 'เครื่องวัดความดัน', other: 'อื่นๆ' }

// ── POST (สาธารณะ): แจ้งปัญหา/คำแนะนำ ─────────────────────────────────────────
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  if (str(b.website, 200)) return NextResponse.json({ ok: true }, { status: 201 }) // honeypot

  const detail = str(b.detail, 2000, { multiline: true })
  if (detail.length < 3) return NextResponse.json({ error: 'detail required', message: 'กรุณากรอกรายละเอียดปัญหา/คำแนะนำ' }, { status: 400 })
  const name = str(b.name, 120) || null
  const phone = str(b.phone, 40) || null
  const wantCallback = !!b.wantCallback
  const source = SOURCES.has(String(b.source)) ? String(b.source) : 'fat'
  const ip = reqIp(req)

  if (ip) {
    const recent = await prisma.feedback.count({ where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } } })
    if (recent >= RATE_MAX) return NextResponse.json({ error: 'rate limited', message: 'ส่งบ่อยเกินไป ลองใหม่ภายหลัง' }, { status: 429 })
  }

  await prisma.feedback.create({ data: { source, detail, name, phone, wantCallback, ip } })
  pushLine(
    `📝 แจ้งปัญหา/คำแนะนำ (${SRC_LABEL[source]})\n` +
    `${detail}\n` +
    `ผู้แจ้ง: ${name || '-'}${phone ? ` · โทร ${phone}` : ''}` +
    (wantCallback ? `\n☎️ ต้องการให้ติดต่อกลับ` : ''),
  )
  return NextResponse.json({ ok: true, message: 'ส่งเรียบร้อย ขอบคุณสำหรับข้อเสนอแนะ' }, { status: 201 })
}

// ── GET (เจ้าหน้าที่): รายการที่แจ้งเข้ามา ─────────────────────────────────────
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const sp = new URL(req.url).searchParams
  const source = sp.get('source')
  const rows = await prisma.feedback.findMany({
    where: source && SOURCES.has(source) ? { source } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, source: true, detail: true, name: true, phone: true, wantCallback: true, createdAt: true, handledAt: true },
  })
  return NextResponse.json({ items: rows }, { headers: { 'Cache-Control': 'no-store' } })
}
