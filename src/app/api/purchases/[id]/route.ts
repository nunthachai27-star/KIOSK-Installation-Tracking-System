import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PurchaseStatus } from '@prisma/client'
import { PURCHASE_DELETE_USERNAMES } from '@/lib/purchase'

const VALID = new Set<string>(Object.values(PurchaseStatus))
const clean = (v: unknown) => (typeof v === 'string' ? (v.trim() || null) : undefined)
const dateField = (v: unknown) => (v === null || v === '' ? null : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : undefined)

// Edit a procurement item (fields and/or status).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof b.itemName === 'string' && b.itemName.trim()) data.itemName = b.itemName.trim()
  if (b.category !== undefined) data.category = clean(b.category)
  if (b.quantity !== undefined && Number.isFinite(Number(b.quantity))) data.quantity = Math.max(1, Math.floor(Number(b.quantity)))
  if (typeof b.unit === 'string' && b.unit.trim()) data.unit = b.unit.trim()
  if (b.vendor !== undefined) data.vendor = clean(b.vendor)
  if (b.price !== undefined) data.price = b.price === null || b.price === '' || !Number.isFinite(Number(b.price)) ? null : Number(b.price)
  if (b.note !== undefined) data.note = clean(b.note)
  if (typeof b.status === 'string' && VALID.has(b.status)) data.status = b.status as PurchaseStatus
  for (const f of ['neededDate', 'orderedDate', 'receivedDate'] as const) {
    if (b[f] !== undefined) { const d = dateField(b[f]); if (d !== undefined) data[f] = d }
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.purchase.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: updated.id, status: updated.status })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Deleting is restricted to a specific allowlist of users.
  const me = session.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } }) : null
  if (!me || !PURCHASE_DELETE_USERNAMES.includes(me.username)) {
    return NextResponse.json({ error: 'forbidden', message: 'บัญชีนี้ไม่มีสิทธิ์ลบงานจัดซื้อ' }, { status: 403 })
  }

  const { id } = await params
  await prisma.purchase.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
