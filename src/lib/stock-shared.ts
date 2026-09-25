// โค้ดฝั่ง client ใช้ร่วมได้ (ไม่ import prisma) — แยกออกจาก stock.ts เพื่อไม่ให้ client bundle ดึง PrismaClient
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
