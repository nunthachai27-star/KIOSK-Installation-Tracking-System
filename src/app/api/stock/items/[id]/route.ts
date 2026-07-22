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

  // Prevent duplicate Serial NO. within the same product (across its lots).
  if (data.serialNo) {
    const item = await prisma.stockItem.findUnique({ where: { id }, select: { lot: { select: { productId: true } } } })
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const dup = await prisma.stockItem.findFirst({
      where: { id: { not: id }, serialNo: { equals: data.serialNo, mode: 'insensitive' }, lot: { productId: item.lot.productId } },
      select: { id: true },
    })
    if (dup) return NextResponse.json({ error: 'duplicate', message: `เลข Serial "${data.serialNo}" มีในสินค้านี้แล้ว` }, { status: 409 })
  }

  const updated = await prisma.stockItem.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'คลังสินค้า', `แก้ไขข้อมูลเครื่อง (serial ${updated.serialNo ?? updated.serialBMS ?? updated.id})`)
  return NextResponse.json({ id: updated.id, serialBMS: updated.serialBMS, serialNo: updated.serialNo, color: updated.color })
}
