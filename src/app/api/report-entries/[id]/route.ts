import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\r\n?/g, '\n').replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
    .split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}

// ── PATCH: แก้งานสรุปพิมพ์เอง (เฉพาะเจ้าของ) ─────────────────────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE' || !session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const row = await prisma.reportEntry.findUnique({ where: { id }, select: { userId: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'forbidden', message: 'แก้ได้เฉพาะงานของตัวเอง' }, { status: 403 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const heading = clean(b.heading, 200)
  const detail = clean(b.detail, 4000)
  if (!heading) return NextResponse.json({ error: 'missing', message: 'กรุณากรอกหัวข้อ' }, { status: 400 })

  const updated = await prisma.reportEntry.update({ where: { id }, data: { heading, detail }, select: { id: true, heading: true, detail: true } })
  await logAction(session.user, 'UPDATE', 'สรุปงาน (พิมพ์เอง)', heading)
  return NextResponse.json({ ok: true, entry: updated })
}

// ── DELETE: ลบงานสรุปพิมพ์เอง (เฉพาะเจ้าของ) ─────────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE' || !session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const row = await prisma.reportEntry.findUnique({ where: { id }, select: { userId: true, heading: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (row.userId !== session.user.id) return NextResponse.json({ error: 'forbidden', message: 'ลบได้เฉพาะงานของตัวเอง' }, { status: 403 })

  await prisma.reportEntry.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'สรุปงาน (พิมพ์เอง)', row.heading)
  return NextResponse.json({ ok: true, id })
}
