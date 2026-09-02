import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// แก้ไข/ติ๊กเสร็จ — เฉพาะรายการของเจ้าของ (กันแก้ของคนอื่นด้วย userId ใน where)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const uid = session?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: { done?: boolean; text?: string } = {}
  if (typeof body?.done === 'boolean') data.done = body.done
  if (typeof body?.text === 'string') {
    const t = body.text.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (t) data.text = t
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  const res = await prisma.todoItem.updateMany({ where: { id, userId: uid }, data })
  if (!res.count) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// ลบ — เฉพาะของเจ้าของ; ?done=1 = ลบทั้งหมดที่เสร็จแล้วของตัวเอง
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const uid = session?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  if (id === 'done') {
    const res = await prisma.todoItem.deleteMany({ where: { userId: uid, done: true } })
    return NextResponse.json({ ok: true, deleted: res.count })
  }
  const res = await prisma.todoItem.deleteMany({ where: { id, userId: uid } })
  if (!res.count) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
