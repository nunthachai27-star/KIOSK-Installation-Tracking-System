import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Deduct an already-assigned component serial from warehouse stock (จ่ายออก).
// Factory serials only run unique *within* a product — the same number legitimately
// exists across models (Kiosk Duo / Hi-End / Start Smart share USW2025110500x) — so a
// serial alone cannot identify a unit. The caller picks the unit (stockItemId); when it
// doesn't, we only auto-resolve an unambiguous single match and otherwise hand back the
// candidates to choose from rather than issuing whichever row happened to come first.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { serialId, stockItemId } = await req.json()
  if (typeof serialId !== 'string' || !serialId) return NextResponse.json({ error: 'serialId required' }, { status: 400 })

  const serial = await prisma.serialNumber.findUnique({
    where: { id: serialId },
    select: { serialNo: true, jobId: true, parent: { select: { serialNo: true } }, job: { select: { hospitalId: true } } },
  })
  if (!serial || !serial.jobId) return NextResponse.json({ error: 'serial not found' }, { status: 404 })

  const pick = { id: true, color: true, lot: { select: { lotCode: true, product: { select: { id: true, group: true, name: true } } } } } as const

  let target: { id: string } | null = null

  if (typeof stockItemId === 'string' && stockItemId) {
    // Explicit choice — take it as long as it is still on the shelf.
    target = await prisma.stockItem.findFirst({ where: { id: stockItemId, status: 'IN_STOCK' }, select: { id: true } })
    if (!target) {
      return NextResponse.json({ error: 'unavailable', message: 'อุปกรณ์ชิ้นนี้ถูกจ่ายออกหรือถูกยืมไปแล้ว' }, { status: 409 })
    }
  } else {
    const candidates = await prisma.stockItem.findMany({
      where: { status: 'IN_STOCK', serialNo: { equals: serial.serialNo, mode: 'insensitive' } },
      select: pick,
      take: 30,
    })
    if (!candidates.length) return NextResponse.json({ error: 'not_in_stock' }, { status: 404 })

    if (candidates.length > 1) {
      // How much of each product is left, so the picker can show quantities.
      const productIds = [...new Set(candidates.map((c) => c.lot.product.id))]
      const counts = await Promise.all(productIds.map(async (id) => [
        id,
        await prisma.stockItem.count({ where: { status: 'IN_STOCK', lot: { productId: id } } }),
      ] as const))
      const remainingOf = new Map(counts)
      return NextResponse.json({
        error: 'ambiguous',
        message: `เลข ${serial.serialNo} มีอยู่ใน ${candidates.length} รายการ — เลือกรายการที่จะตัด`,
        serialNo: serial.serialNo,
        candidates: candidates.map((c) => ({
          stockItemId: c.id,
          group: c.lot.product.group,
          product: c.lot.product.name,
          lotCode: c.lot.lotCode,
          color: c.color,
          remaining: remainingOf.get(c.lot.product.id) ?? 0,
        })),
      }, { status: 409 })
    }
    target = { id: candidates[0].id }
  }

  await prisma.stockItem.update({
    where: { id: target.id },
    data: {
      status: 'ISSUED', jobId: serial.jobId, hospitalId: serial.job?.hospitalId ?? null,
      serialBMS: serial.parent?.serialNo ?? null, issuedDate: new Date(),
    },
  })
  await logAction(session.user, 'UPDATE', 'คลังสินค้า', `ตัดจ่ายออก serial ${serial.serialNo}`)
  return NextResponse.json({ ok: true, stockItemId: target.id })
}
