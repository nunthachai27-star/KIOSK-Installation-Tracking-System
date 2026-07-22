import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PurchaseStatus } from '@prisma/client'
import { logAction } from '@/lib/audit'

const VALID = new Set<string>(Object.values(PurchaseStatus))
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const dateOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null)

// Create a procurement item (งานจัดซื้อ).
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json()
  const itemName = str(b.itemName)
  if (!itemName) return NextResponse.json({ error: 'name required', message: 'กรอกชื่อสินค้า/อุปกรณ์' }, { status: 400 })

  const status = typeof b.status === 'string' && VALID.has(b.status) ? (b.status as PurchaseStatus) : 'REQUESTED'
  const num = (v: unknown) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

  const created = await prisma.purchase.create({
    data: {
      itemName,
      category: str(b.category),
      quantity: Number.isFinite(Number(b.quantity)) ? Math.max(1, Math.floor(Number(b.quantity))) : 1,
      unit: str(b.unit) ?? 'ชิ้น',
      vendor: str(b.vendor),
      unitPrice: num(b.unitPrice),
      price: num(b.price),
      status,
      note: str(b.note),
      neededDate: dateOrNull(b.neededDate),
      orderedDate: dateOrNull(b.orderedDate),
      receivedDate: dateOrNull(b.receivedDate),
      requestedById: session.user?.id ?? null,
    },
  })
  await logAction(session.user, 'CREATE', 'งานจัดซื้อ', `เพิ่ม "${itemName}"`)
  return NextResponse.json({ id: created.id }, { status: 201 })
}
