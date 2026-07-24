import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Edit an individual stock unit's identity fields (serial BMS / serial NO. / color).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const clean = (v: unknown) => (typeof v === 'string' ? (v.trim() || null) : undefined)

  const data: { serialBMS?: string | null; serialNo?: string | null; color?: string | null } = {}
  if (body.serialBMS !== undefined) data.serialBMS = clean(body.serialBMS)
  if (body.serialNo !== undefined) data.serialNo = clean(body.serialNo)
  if (body.color !== undefined) data.color = clean(body.color)
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  // Serial NO. edits are guarded: once a unit is issued it must stay locked,
  // and a new value must not duplicate another unit of the same product.
  if (body.serialNo !== undefined) {
    const item = await prisma.stockItem.findUnique({ where: { id }, select: { status: true, lot: { select: { productId: true } } } })
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    // Locked: an issued unit's Serial NO. cannot be changed or cleared.
    if (item.status === 'ISSUED') {
      return NextResponse.json({ error: 'locked', message: 'รายการนี้จ่ายออกแล้ว — แก้ไข/ลบ Serial NO. ไม่ได้' }, { status: 409 })
    }
    if (data.serialNo) {
      const dup = await prisma.stockItem.findFirst({
        where: { id: { not: id }, serialNo: { equals: data.serialNo, mode: 'insensitive' }, lot: { productId: item.lot.productId } },
        select: { id: true },
      })
      if (dup) return NextResponse.json({ error: 'duplicate', message: `เลข Serial "${data.serialNo}" มีในสินค้านี้แล้ว` }, { status: 409 })
    }
  }

  const updated = await prisma.stockItem.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'คลังสินค้า', `แก้ไขข้อมูลเครื่อง (serial ${updated.serialNo ?? updated.serialBMS ?? updated.id})`)
  return NextResponse.json({ id: updated.id, serialBMS: updated.serialBMS, serialNo: updated.serialNo, color: updated.color })
}

// Remove a blank spare unit from a lot (e.g. the lot was received with fewer
// units than recorded). Only ever allowed while the unit is untouched: still in
// stock, no serial recorded, and never lent out.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const item = await prisma.stockItem.findUnique({
    where: { id },
    select: {
      id: true, status: true, serialNo: true, serialBMS: true, lotId: true,
      lot: { select: { lotCode: true, receivedQty: true } },
      _count: { select: { loans: true } },
    },
  })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (item.status !== 'IN_STOCK') {
    return NextResponse.json({ error: 'not_in_stock', message: 'รายการนี้จ่ายออก/ถูกยืมแล้ว — ลบไม่ได้' }, { status: 409 })
  }
  if (item.serialNo?.trim() || item.serialBMS?.trim()) {
    return NextResponse.json({ error: 'has_serial', message: 'รายการนี้มีเลข Serial แล้ว — ลบไม่ได้ (ล้างเลขก่อนถ้าต้องการลบ)' }, { status: 409 })
  }
  if (item._count.loans > 0) {
    return NextResponse.json({ error: 'has_loans', message: 'รายการนี้มีประวัติการยืม — ลบไม่ได้' }, { status: 409 })
  }

  // Keep the lot's recorded quantity in step with the unit rows.
  await prisma.$transaction([
    prisma.stockItem.delete({ where: { id } }),
    ...(item.lot.receivedQty > 0
      ? [prisma.stockLot.update({ where: { id: item.lotId }, data: { receivedQty: { decrement: 1 } } })]
      : []),
  ])
  await logAction(session.user, 'DELETE', 'คลังสินค้า', `ลบเครื่องว่างใน Lot ${item.lot.lotCode}`)
  return NextResponse.json({ ok: true })
}
