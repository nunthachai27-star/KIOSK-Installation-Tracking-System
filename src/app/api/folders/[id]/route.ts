import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Rename a folder.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const updated = await prisma.fileFolder.update({ where: { id }, data: { name } }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'ไฟล์ทีม', `เปลี่ยนชื่อโฟลเดอร์เป็น "${name}"`)
  return NextResponse.json({ id: updated.id, name: updated.name })
}

// Delete a folder. Files inside are kept (moved to "ไม่มีโฟลเดอร์" via FK SET NULL).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const folder = await prisma.fileFolder.findUnique({ where: { id }, select: { name: true } })
  if (!folder) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.fileFolder.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'ไฟล์ทีม', `ลบโฟลเดอร์ "${folder.name}"`)
  return NextResponse.json({ ok: true })
}
