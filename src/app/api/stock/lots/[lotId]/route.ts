import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'

// PATCH /api/stock/lots/:lotId { lotCode } → เปลี่ยนชื่อ Lot (เฉพาะ super admin)
// ชิ้นในคลัง/งาน/เคลม ผูกกับ Lot ด้วย id จึงไม่กระทบอะไร — แค่กันชื่อซ้ำในสินค้าเดียวกัน
export async function PATCH(req: Request, { params }: { params: Promise<{ lotId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE' || !(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin' }, { status: 403 })

  const { lotId } = await params
  const b = await req.json().catch(() => null)
  const lotCode = typeof b?.lotCode === 'string' ? b.lotCode.trim().replace(/^lot\s*/i, '') : ''
  if (!lotCode) return NextResponse.json({ error: 'lotCode required', message: 'กรุณากรอกชื่อ Lot' }, { status: 400 })

  const lot = await prisma.stockLot.findUnique({ where: { id: lotId }, select: { id: true, lotCode: true, productId: true, product: { select: { name: true } } } })
  if (!lot) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (lot.lotCode === lotCode) return NextResponse.json({ id: lot.id, lotCode })

  const dup = await prisma.stockLot.findFirst({
    where: { productId: lot.productId, id: { not: lot.id }, lotCode: { equals: lotCode, mode: 'insensitive' } },
    select: { id: true },
  })
  if (dup) return NextResponse.json({ error: 'duplicate', message: `สินค้านี้มี Lot ${lotCode} อยู่แล้ว` }, { status: 409 })

  await prisma.stockLot.update({ where: { id: lot.id }, data: { lotCode } })
  await logAction(session.user, 'UPDATE', 'คลังสินค้า', `${lot.product.name}: เปลี่ยนชื่อ Lot ${lot.lotCode} → ${lotCode}`)
  return NextResponse.json({ id: lot.id, lotCode })
}
