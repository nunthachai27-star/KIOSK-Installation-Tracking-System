import { prisma } from './prisma'

export type StockStatusLevel = 'OK' | 'LOW' | 'OUT'

export function stockLevel(remaining: number, lowStockQty: number): StockStatusLevel {
  if (remaining <= 0) return 'OUT'
  if (remaining <= lowStockQty) return 'LOW'
  return 'OK'
}

export const STOCK_LEVEL_META: Record<StockStatusLevel, { label: string; color: string; bg: string }> = {
  OK: { label: 'มีสินค้า', color: '#157F4C', bg: '#E2F3EA' },
  LOW: { label: 'ใกล้หมด', color: '#B45309', bg: '#FBEBCB' },
  OUT: { label: 'สินค้าหมด', color: '#C13540', bg: '#FBE4E4' },
}

export type LotSummary = { id: string; lotCode: string; received: number; issued: number; borrowed: number; remaining: number }
export type ProductSummary = {
  id: string; name: string; group: string; unit: string; lowStockQty: number
  received: number; issued: number; borrowed: number; remaining: number; level: StockStatusLevel; lots: LotSummary[]
}
export type GroupSummary = { group: string; received: number; issued: number; borrowed: number; remaining: number; products: ProductSummary[] }

export async function getStockSummary() {
  const [products, lots, issuedByLot, borrowedByLot] = await Promise.all([
    prisma.stockProduct.findMany({ where: { active: true }, orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.stockLot.findMany({ select: { id: true, productId: true, lotCode: true, receivedQty: true, _count: { select: { items: true } } } }),
    prisma.stockItem.groupBy({ by: ['lotId'], where: { status: 'ISSUED' }, _count: true }),
    prisma.stockItem.groupBy({ by: ['lotId'], where: { status: 'BORROWED' }, _count: true }),
  ])

  const serializedOf = new Map(products.map((p) => [p.id, p.serialized]))
  const issuedMap = new Map(issuedByLot.map((g) => [g.lotId, g._count]))
  const borrowedMap = new Map(borrowedByLot.map((g) => [g.lotId, g._count]))
  const lotsByProduct = new Map<string, LotSummary[]>()
  for (const l of lots) {
    // Serial products count individual items; quantity-only products (spare parts) use receivedQty.
    const serialized = serializedOf.get(l.productId) ?? true
    const received = serialized ? l._count.items : l.receivedQty
    const issued = serialized ? (issuedMap.get(l.id) ?? 0) : 0
    // Units out on loan are still owned but not available to hand out.
    const borrowed = serialized ? (borrowedMap.get(l.id) ?? 0) : 0
    const arr = lotsByProduct.get(l.productId) ?? []
    arr.push({ id: l.id, lotCode: l.lotCode, received, issued, borrowed, remaining: received - issued - borrowed })
    lotsByProduct.set(l.productId, arr)
  }

  const groupMap = new Map<string, GroupSummary>()
  let kReceived = 0, kIssued = 0, kBorrowed = 0, kRemaining = 0, kLow = 0, kOut = 0
  for (const p of products) {
    const plots = (lotsByProduct.get(p.id) ?? []).sort((a, b) => a.lotCode.localeCompare(b.lotCode))
    const received = plots.reduce((s, l) => s + l.received, 0)
    const issued = plots.reduce((s, l) => s + l.issued, 0)
    const borrowed = plots.reduce((s, l) => s + l.borrowed, 0)
    const remaining = received - issued - borrowed
    const level = stockLevel(remaining, p.lowStockQty)
    kReceived += received; kIssued += issued; kBorrowed += borrowed; kRemaining += remaining
    if (level === 'LOW') kLow++; if (level === 'OUT') kOut++
    const ps: ProductSummary = { id: p.id, name: p.name, group: p.group, unit: p.unit, lowStockQty: p.lowStockQty, received, issued, borrowed, remaining, level, lots: plots }
    const g = groupMap.get(p.group) ?? { group: p.group, received: 0, issued: 0, borrowed: 0, remaining: 0, products: [] }
    g.received += received; g.issued += issued; g.borrowed += borrowed; g.remaining += remaining; g.products.push(ps)
    groupMap.set(p.group, g)
  }

  const groups = [...groupMap.values()].sort((a, b) => b.received - a.received)
  return { kpi: { received: kReceived, issued: kIssued, borrowed: kBorrowed, remaining: kRemaining, low: kLow, out: kOut, products: products.length }, groups }
}
