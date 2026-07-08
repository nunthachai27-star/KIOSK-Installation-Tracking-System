import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { productType, label } = await req.json()
  if (typeof productType !== 'string' || !productType.trim() || typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'productType and label required' }, { status: 400 })
  }
  const pt = productType.trim()
  const value = label.trim()

  const dup = await prisma.productChecklistItem.findUnique({ where: { productType_label: { productType: pt, label: value } } })
  if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })

  const max = await prisma.productChecklistItem.aggregate({ where: { productType: pt }, _max: { sortOrder: true } })
  const created = await prisma.productChecklistItem.create({
    data: { productType: pt, label: value, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(created, { status: 201 })
}
