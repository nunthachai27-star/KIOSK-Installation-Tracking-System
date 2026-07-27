import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Record a spare part / unit used on a claim.
//  - stockItemId  → cut a specific serialized warehouse unit: flip it to CLAIM (leaves คงเหลือ).
//  - stockProductId / name → legacy quantity-only record (no stock movement).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true } })
  if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json()

  // Cut a specific unit out of the warehouse for this claim (by serial).
  if (typeof b.stockItemId === 'string' && b.stockItemId) {
    const unit = await prisma.stockItem.findUnique({
      where: { id: b.stockItemId },
      select: {
        id: true, status: true, serialBMS: true, serialNo: true,
        lot: { select: { productId: true, product: { select: { name: true, sellPrice: true } } } },
      },
    })
    if (!unit) return NextResponse.json({ error: 'stock item not found' }, { status: 404 })
    if (unit.status !== 'IN_STOCK') {
      return NextResponse.json({ error: 'not available', message: 'ชิ้นนี้ไม่พร้อมตัด (อาจถูกจ่าย/ยืม/เคลมไปแล้ว)' }, { status: 409 })
    }
    const sn = unit.serialBMS || unit.serialNo || null
    const price = unit.lot.product.sellPrice?.toNumber() ?? null
    const created = await prisma.$transaction(async (tx) => {
      // Only proceed if it is still IN_STOCK (guards against a double-cut race).
      const flipped = await tx.stockItem.updateMany({
        where: { id: unit.id, status: 'IN_STOCK' }, data: { status: 'CLAIM', note: 'ตัดใช้ในเคลม' },
      })
      if (flipped.count === 0) throw new Error('conflict')
      const cp = await tx.claimPart.create({
        data: { issueId: id, stockProductId: unit.lot.productId, stockItemId: unit.id, serialNo: sn, name: unit.lot.product.name, qty: 1, unitPrice: price, stockDeducted: true },
      })
      await tx.issueEvent.create({
        data: { issueId: id, type: 'PART_USED', note: `ตัดเคลม ${unit.lot.product.name}${sn ? ` S/N ${sn}` : ''}`, actorName: session.user.name ?? null },
      })
      return cp
    }).catch(() => null)
    if (!created) return NextResponse.json({ error: 'conflict', message: 'ชิ้นนี้เพิ่งถูกตัดไปแล้ว' }, { status: 409 })
    return NextResponse.json({ id: created.id, name: created.name, qty: created.qty, unitPrice: price, stockDeducted: true, serialNo: sn }, { status: 201 })
  }

  // Legacy: quantity-only spare part (no stock movement).
  const qty = Math.max(1, Math.trunc(Number(b.qty) || 1))
  let stockProductId: string | null = null
  let name = typeof b.name === 'string' ? b.name.trim() : ''
  let unitPrice: number | null = null
  if (typeof b.stockProductId === 'string' && b.stockProductId) {
    const prod = await prisma.stockProduct.findUnique({ where: { id: b.stockProductId }, select: { id: true, name: true, sellPrice: true } })
    if (!prod) return NextResponse.json({ error: 'stock product not found' }, { status: 404 })
    stockProductId = prod.id
    name = prod.name
    unitPrice = prod.sellPrice?.toNumber() ?? null
  }
  if (!name) return NextResponse.json({ error: 'stockItemId, stockProductId or name required' }, { status: 400 })

  const created = await prisma.claimPart.create({
    data: { issueId: id, stockProductId, name, qty, unitPrice, stockDeducted: false },
  })
  await prisma.issueEvent.create({
    data: { issueId: id, type: 'PART_USED', note: `ใช้อะไหล่ ${name} × ${qty}`, actorName: session.user.name ?? null },
  })
  return NextResponse.json({ id: created.id, name: created.name, qty: created.qty, unitPrice, stockDeducted: false, serialNo: null }, { status: 201 })
}
