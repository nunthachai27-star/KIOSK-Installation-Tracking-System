import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isDevType, isDevPriority, isDevStatus, STATUS_META, type DevStatus } from '@/lib/devRequest'
import { str, serializeOneWithImages, REQUEST_INCLUDE } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── PATCH: แก้ไขคำขอ / เปลี่ยนสถานะ / เพิ่มคอมเมนต์ (เจ้าหน้าที่เท่านั้น) ────────
// body รับได้: type, priority, product, title, detail, steps, expected, links, status, note
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const cur = await prisma.devRequest.findUnique({ where: { id }, select: { id: true, status: true, title: true } })
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const actorName = session.user.name ?? null

  // ฟิลด์เนื้อหา (แก้เฉพาะที่ส่งมา)
  const data: Record<string, unknown> = {}
  if (typeof b.product === 'string') data.product = str(b.product, 120)
  if (typeof b.title === 'string') data.title = str(b.title, 200)
  if (typeof b.detail === 'string') data.detail = str(b.detail, 4000, { multiline: true })
  if (typeof b.steps === 'string') data.steps = str(b.steps, 2000, { multiline: true }) || null
  if (typeof b.expected === 'string') data.expected = str(b.expected, 2000, { multiline: true }) || null
  if (typeof b.links === 'string') data.links = str(b.links, 1000, { multiline: true }) || null
  if (isDevType(b.type)) data.type = b.type
  if (isDevPriority(b.priority)) data.priority = b.priority

  const note = str(b.note, 2000, { multiline: true }) || null
  const newStatus: DevStatus | null = isDevStatus(b.status) && b.status !== cur.status ? b.status : null

  // สร้างเหตุการณ์ไทม์ไลน์ (เปลี่ยนสถานะ และ/หรือ คอมเมนต์)
  const events: Array<Record<string, unknown>> = []
  if (newStatus) {
    data.status = newStatus
    events.push({ actor: 'STAFF', actorName, fromStatus: cur.status, toStatus: newStatus, note })
  } else if (note) {
    events.push({ actor: 'STAFF', actorName, note })
  }

  if (Object.keys(data).length === 0 && events.length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }
  if (events.length) data.events = { create: events }

  const updated = await prisma.devRequest.update({ where: { id }, data, include: REQUEST_INCLUDE })
  await logAction(session.user, 'UPDATE', 'คำขอพัฒนา',
    newStatus ? `"${cur.title}" → ${STATUS_META[newStatus].label}` : `แก้ไข "${cur.title}"`)
  return NextResponse.json({ ok: true, request: await serializeOneWithImages(updated) })
}

// ── DELETE: ลบคำขอ (เจ้าหน้าที่เท่านั้น — ยืนยันฝั่งหน้าเว็บก่อน) ─────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const row = await prisma.devRequest.findUnique({ where: { id }, select: { title: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.devRequest.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'คำขอพัฒนา', `ลบคำขอ "${row.title}"`)
  return NextResponse.json({ ok: true, id })
}
