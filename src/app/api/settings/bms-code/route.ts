import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Set (or clear) the BMS serial code for a product type.
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { productType, code } = await req.json()
  if (typeof productType !== 'string' || !productType.trim()) {
    return NextResponse.json({ error: 'productType required' }, { status: 400 })
  }
  const pt = productType.trim()
  const value = typeof code === 'string' ? code.trim().toUpperCase() : ''

  if (!value) {
    await prisma.productBmsCode.deleteMany({ where: { productType: pt } })
    return NextResponse.json({ productType: pt, code: '' })
  }
  const saved = await prisma.productBmsCode.upsert({
    where: { productType: pt },
    create: { productType: pt, code: value },
    update: { code: value },
  })
  return NextResponse.json(saved)
}
