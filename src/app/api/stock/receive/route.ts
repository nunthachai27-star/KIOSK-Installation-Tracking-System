import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ItemInput = { serialBMS?: string; serialNo?: string; color?: string }

// Receive stock into inventory: pick/create a product, create a Lot, add its units (IN_STOCK).
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { productId, newProduct, lotCode, receivedDate, note, items, quantity, color } = body

  if (typeof lotCode !== 'string' || !lotCode.trim()) {
    return NextResponse.json({ error: 'lotCode required' }, { status: 400 })
  }

  // Resolve product: existing id, or create/reuse from group+name.
  let pid: string
  if (typeof productId === 'string' && productId) {
    const exists = await prisma.stockProduct.findUnique({ where: { id: productId }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'product not found' }, { status: 404 })
    pid = exists.id
  } else if (newProduct && typeof newProduct.group === 'string' && newProduct.group.trim() && typeof newProduct.name === 'string' && newProduct.name.trim()) {
    const group = newProduct.group.trim()
    const name = newProduct.name.trim()
    const found = await prisma.stockProduct.findUnique({ where: { group_name: { group, name } }, select: { id: true } })
    pid = found
      ? found.id
      : (await prisma.stockProduct.create({
          data: {
            group, name,
            unit: typeof newProduct.unit === 'string' && newProduct.unit.trim() ? newProduct.unit.trim() : 'เครื่อง',
            lowStockQty: Number.isFinite(Number(newProduct.lowStockQty)) ? Math.max(0, Number(newProduct.lowStockQty)) : 3,
          },
        })).id
  } else {
    return NextResponse.json({ error: 'product required' }, { status: 400 })
  }

  // Build item rows: explicit serial rows take precedence, else a plain quantity.
  const rows: { serialBMS: string | null; serialNo: string | null; color: string | null }[] = []
  const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  if (Array.isArray(items)) {
    for (const it of items as ItemInput[]) {
      const sb = clean(it.serialBMS), sn = clean(it.serialNo), c = clean(it.color)
      if (sb || sn || c) rows.push({ serialBMS: sb, serialNo: sn, color: c })
    }
  }
  if (!rows.length) {
    const qty = Math.max(0, Math.floor(Number(quantity) || 0))
    const c = clean(color)
    for (let i = 0; i < qty; i++) rows.push({ serialBMS: null, serialNo: null, color: c })
  }
  if (!rows.length) return NextResponse.json({ error: 'no items' }, { status: 400 })

  // Prevent duplicate Serial NO. — within the batch itself and against existing stock of this product.
  const serials = rows.map((r) => r.serialNo).filter((s): s is string => !!s)
  if (serials.length) {
    const seen = new Set<string>()
    for (const s of serials) {
      const k = s.toLowerCase()
      if (seen.has(k)) return NextResponse.json({ error: 'duplicate', message: `เลข Serial "${s}" ซ้ำในรายการที่กรอก` }, { status: 409 })
      seen.add(k)
    }
    const existing = await prisma.stockItem.findFirst({
      where: { lot: { productId: pid }, OR: serials.map((s) => ({ serialNo: { equals: s, mode: 'insensitive' as const } })) },
      select: { serialNo: true },
    })
    if (existing) return NextResponse.json({ error: 'duplicate', message: `เลข Serial "${existing.serialNo}" มีในสินค้านี้แล้ว` }, { status: 409 })
  }

  const recv = typeof receivedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(receivedDate) ? new Date(`${receivedDate}T00:00:00Z`) : null

  const lot = await prisma.stockLot.create({
    data: { productId: pid, lotCode: lotCode.trim(), receivedQty: rows.length, receivedDate: recv, note: clean(note) },
  })
  await prisma.stockItem.createMany({
    data: rows.map((r, i) => ({
      lotId: lot.id, seq: i + 1, serialBMS: r.serialBMS, serialNo: r.serialNo, color: r.color,
      status: 'IN_STOCK' as const, receivedDate: recv,
    })),
  })

  return NextResponse.json({ productId: pid, lotId: lot.id, count: rows.length }, { status: 201 })
}
