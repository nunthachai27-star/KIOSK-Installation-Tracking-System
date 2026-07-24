import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Record a spare part used on a claim/repair (optionally deducting it from stock).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true } })
  if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json()
  const qty = Math.max(1, Math.trunc(Number(b.qty) || 1))
  let stockProductId: string | null = null
  let name = typeof b.name === 'string' ? b.name.trim() : ''
  let unitPrice: number | null = null
  let deducted = false

  // Spare part chosen from the warehouse (คลังสินค้า → กลุ่มอะไหล่).
  if (typeof b.stockProductId === 'string' && b.stockProductId) {
    const prod = await prisma.stockProduct.findUnique({ where: { id: b.stockProductId }, select: { id: true, name: true, sellPrice: true } })
    if (!prod) return NextResponse.json({ error: 'stock product not found' }, { status: 404 })
    stockProductId = prod.id
    name = prod.name
    unitPrice = prod.sellPrice?.toNumber() ?? null
    // Stock deduction from claims is disabled for now — record the part used,
    // but never mark warehouse units as issued. (kept off intentionally)
    void b.deductStock
  }
  if (!name) return NextResponse.json({ error: 'stockProductId or name required' }, { status: 400 })

  const created = await prisma.claimPart.create({
    data: { issueId: id, stockProductId, name, qty, unitPrice, stockDeducted: deducted },
  })
  await prisma.issueEvent.create({
    data: { issueId: id, type: 'PART_USED', note: `ใช้อะไหล่ ${name} × ${qty}${deducted ? ' (ตัดสต็อก)' : ''}`, actorName: session.user.name ?? null },
  })
  return NextResponse.json({ id: created.id, name: created.name, qty: created.qty, unitPrice, stockDeducted: deducted }, { status: 201 })
}
