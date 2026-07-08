import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { productType, name, quantity, needsSerial } = await req.json()
  if (typeof productType !== 'string' || !productType.trim() || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'productType and name required' }, { status: 400 })
  }
  const pt = productType.trim()
  const nm = name.trim()
  const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1

  const dup = await prisma.productComponent.findUnique({ where: { productType_name: { productType: pt, name: nm } } })
  if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })

  const max = await prisma.productComponent.aggregate({ where: { productType: pt }, _max: { sortOrder: true } })
  const created = await prisma.productComponent.create({
    data: { productType: pt, name: nm, quantity: qty, needsSerial: needsSerial !== false, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(created, { status: 201 })
}
