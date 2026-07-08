import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ALL_SERIAL_TYPES } from '@/lib/serial-types'
import type { SerialType } from '@prisma/client'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { productType, serialType } = await req.json()
  if (typeof productType !== 'string' || !productType.trim() || !ALL_SERIAL_TYPES.includes(serialType)) {
    return NextResponse.json({ error: 'productType and valid serialType required' }, { status: 400 })
  }
  const pt = productType.trim()
  const st = serialType as SerialType

  const dup = await prisma.productSerialSlot.findUnique({ where: { productType_serialType: { productType: pt, serialType: st } } })
  if (dup) return NextResponse.json(dup, { status: 200 })

  const order = ALL_SERIAL_TYPES.indexOf(st)
  const created = await prisma.productSerialSlot.create({ data: { productType: pt, serialType: st, sortOrder: order } })
  return NextResponse.json(created, { status: 201 })
}
