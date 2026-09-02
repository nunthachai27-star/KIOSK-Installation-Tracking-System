import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// To-Do ส่วนตัว — ทุกคำสั่งกรองด้วย userId ของผู้ล็อกอินเสมอ (เห็นเฉพาะของตัวเอง)
export async function GET() {
  const session = await auth()
  const uid = session?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const items = await prisma.todoItem.findMany({
    where: { userId: uid },
    orderBy: [{ done: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, text: true, done: true },
  })
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const session = await auth()
  const uid = session?.user?.id
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const text = String(body?.text ?? '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  const item = await prisma.todoItem.create({
    data: { userId: uid, text },
    select: { id: true, text: true, done: true },
  })
  return NextResponse.json({ item }, { status: 201 })
}
