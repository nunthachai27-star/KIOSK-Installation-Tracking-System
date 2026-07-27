import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

const dateOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null)

// Edit one resolution-timeline entry (date and/or text).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id, sid } = await params
  const row = await prisma.issueSolution.findFirst({ where: { id: sid, issueId: id }, select: { id: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json()
  const data: { text?: string; date?: Date } = {}
  if (typeof b.text === 'string' && b.text.trim()) data.text = b.text.trim()
  if (b.date !== undefined) { const d = dateOrNull(b.date); if (d) data.date = d }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.issueSolution.update({ where: { id: sid }, data })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/เคลม', `แก้วิธีแก้ไข "${updated.text.slice(0, 40)}"`)
  return NextResponse.json({ id: updated.id, date: updated.date.toISOString(), text: updated.text, authorName: updated.authorName })
}

// Remove one resolution-timeline entry.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id, sid } = await params
  const row = await prisma.issueSolution.findFirst({ where: { id: sid, issueId: id }, select: { id: true, text: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.issueSolution.delete({ where: { id: row.id } })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/เคลม', `ลบวิธีแก้ไข "${row.text.slice(0, 40)}"`)
  return NextResponse.json({ ok: true })
}
