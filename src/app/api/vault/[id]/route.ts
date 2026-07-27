import { NextResponse } from 'next/server'
import { unlink } from 'node:fs/promises'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { resolveStored } from '@/lib/vault'

// Edit file metadata (rename / move folder / note).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const data: { name?: string; note?: string | null; folderId?: string | null } = {}
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim().slice(0, 200)
  if (b.note !== undefined) data.note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 500) : null
  if (b.folderId !== undefined) data.folderId = typeof b.folderId === 'string' && b.folderId ? b.folderId : null
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  const updated = await prisma.fileAsset.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'ไฟล์ทีม', `แก้ไขไฟล์ "${updated.name}"`)
  return NextResponse.json({ id: updated.id })
}

// Delete a file (metadata + the file on disk).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const file = await prisma.fileAsset.findUnique({ where: { id }, select: { name: true, storedPath: true } })
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const abs = resolveStored(file.storedPath)
  if (abs) await unlink(abs).catch(() => {})
  await prisma.fileAsset.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'ไฟล์ทีม', `ลบไฟล์ "${file.name}"`)
  return NextResponse.json({ ok: true })
}
