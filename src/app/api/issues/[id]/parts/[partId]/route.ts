import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Remove a spare part from a claim — restores stock if it was deducted.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; partId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { partId } = await params
  const part = await prisma.claimPart.findUnique({ where: { id: partId } })
  if (part) {
    if (part.stockDeducted && part.stockProductId) {
      // Return the consumed units to the warehouse.
      const items = await prisma.stockItem.findMany({
        where: { status: 'ISSUED', note: 'ตัดใช้ในเคลม', lot: { productId: part.stockProductId } }, take: part.qty, select: { id: true },
      })
      if (items.length) {
        await prisma.stockItem.updateMany({
          where: { id: { in: items.map((i) => i.id) } },
          data: { status: 'IN_STOCK', note: null, issuedDate: null },
        })
      }
    } else if (part.stockDeducted && part.sparePartId) {
      // Legacy claim parts deducted from the old spare-part table.
      await prisma.sparePart.update({ where: { id: part.sparePartId }, data: { stockQty: { increment: part.qty } } }).catch(() => null)
    }
    await prisma.claimPart.delete({ where: { id: partId } }).catch(() => null)
  }
  return NextResponse.json({ ok: true })
}
