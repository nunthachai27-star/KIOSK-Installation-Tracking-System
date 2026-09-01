import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST /api/stock/report/map  { componentId, stockProductId }
// ผูก/ยกเลิกการผูก อุปกรณ์กับสินค้าในคลัง (ใช้เฉพาะรายงาน) — stockProductId ว่าง = ยกเลิกผูก
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const componentId = typeof body?.componentId === 'string' ? body.componentId : ''
  const stockProductId = typeof body?.stockProductId === 'string' ? body.stockProductId.trim() : ''
  if (!componentId) return NextResponse.json({ error: 'componentId required' }, { status: 400 })

  // ตรวจว่ามี component จริง (กัน id มั่ว)
  const comp = await prisma.productComponent.findUnique({ where: { id: componentId }, select: { name: true } })
  if (!comp) return NextResponse.json({ error: 'component not found' }, { status: 404 })

  if (!stockProductId) {
    await prisma.stockReportMap.deleteMany({ where: { componentId } })
    return NextResponse.json({ ok: true, cleared: true })
  }

  const prod = await prisma.stockProduct.findUnique({ where: { id: stockProductId }, select: { name: true } })
  if (!prod) return NextResponse.json({ error: 'stock product not found' }, { status: 404 })

  await prisma.stockReportMap.upsert({
    where: { componentId },
    create: { componentId, stockProductId },
    update: { stockProductId },
  })
  await logAction(session.user, 'UPDATE', 'รายงานคลัง', `ผูก ${comp.name} → ${prod.name}`)
  return NextResponse.json({ ok: true })
}
