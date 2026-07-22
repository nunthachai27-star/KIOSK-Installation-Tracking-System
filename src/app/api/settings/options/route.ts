import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isCategory } from '@/lib/master'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const category = new URL(req.url).searchParams.get('category') ?? ''
  if (!isCategory(category)) return NextResponse.json({ error: 'bad category' }, { status: 400 })
  const items = await prisma.masterOption.findMany({
    where: { category },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { category, value } = await req.json()
  if (!isCategory(category) || typeof value !== 'string' || !value.trim()) {
    return NextResponse.json({ error: 'category and value required' }, { status: 400 })
  }
  const dup = await prisma.masterOption.findUnique({ where: { category_value: { category, value: value.trim() } } })
  if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  const max = await prisma.masterOption.aggregate({ where: { category }, _max: { sortOrder: true } })
  const created = await prisma.masterOption.create({
    data: { category, value: value.trim(), sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  await logAction(session.user, 'CREATE', 'ตั้งค่า', `เพิ่มตัวเลือก "${created.value}"`)
  return NextResponse.json(created, { status: 201 })
}
