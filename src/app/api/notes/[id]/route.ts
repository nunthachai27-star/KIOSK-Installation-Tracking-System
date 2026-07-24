import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

const COLORS = new Set(['yellow', 'green', 'blue', 'pink', 'gray'])
const clean = (v: unknown) => (typeof v === 'string' ? (v.trim() || null) : undefined)
const dateField = (v: unknown) => (v === null || v === '' ? null : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : undefined)

// Edit a note (any OFFICE user — the board is shared, equal rights).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof b.body === 'string' && b.body.trim()) data.body = b.body.trim()
  if (b.title !== undefined) data.title = clean(b.title)
  if (typeof b.color === 'string' && COLORS.has(b.color)) data.color = b.color
  if (typeof b.pinned === 'boolean') data.pinned = b.pinned
  if (b.link !== undefined) data.link = clean(b.link)
  if (b.remindAt !== undefined) { const d = dateField(b.remindAt); if (d !== undefined) data.remindAt = d }

  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.note.update({ where: { id }, data, select: { id: true, title: true, body: true } }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'โน้ต', `แก้โน้ต "${(updated.title ?? updated.body).slice(0, 40)}"`)
  return NextResponse.json({ id: updated.id })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const gone = await prisma.note.delete({ where: { id }, select: { title: true, body: true } }).catch(() => null)
  if (gone) await logAction(session.user, 'DELETE', 'โน้ต', `ลบโน้ต "${(gone.title ?? gone.body).slice(0, 40)}"`)
  return NextResponse.json({ ok: true })
}
