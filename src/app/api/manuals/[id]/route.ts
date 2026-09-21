import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: { title?: string; description?: string | null; category?: string | null; linkUrl?: string | null } = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200)
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 2000) : null
  if (body.category !== undefined) data.category = body.category ? String(body.category).slice(0, 100) : null
  if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl ? String(body.linkUrl).slice(0, 1000) : null
  const updated = await prisma.manual.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  // ลบไฟล์แนบของคู่มือ (แถวใน Attachment) แล้วลบคู่มือ
  await prisma.attachment.deleteMany({ where: { refTable: 'Manual', refId: id } })
  await prisma.manual.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
