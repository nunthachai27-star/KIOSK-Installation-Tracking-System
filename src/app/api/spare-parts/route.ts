import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json()
  if (typeof b.name !== 'string' || !b.name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const created = await prisma.sparePart.create({
    data: {
      name: b.name.trim(),
      category: typeof b.category === 'string' && b.category.trim() ? b.category.trim() : null,
      stockQty: Number.isFinite(Number(b.stockQty)) ? Math.max(0, Math.trunc(Number(b.stockQty))) : 0,
      sellPrice: toNum(b.sellPrice),
      serviceFee1: toNum(b.serviceFee1),
      serviceFee2: toNum(b.serviceFee2),
      requiresOnsite: Boolean(b.requiresOnsite),
      imageUrl: typeof b.imageUrl === 'string' && b.imageUrl.trim() ? b.imageUrl.trim() : null,
      remark: typeof b.remark === 'string' && b.remark.trim() ? b.remark.trim() : null,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
