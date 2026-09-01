import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildStockReport, productTypesWithComponents, stockProductCounts } from '@/lib/stockReport'

export const dynamic = 'force-dynamic'

// GET /api/stock/report                 → รายชื่อประเภทสินค้า + สินค้าในคลัง (สำหรับตัวเลือก)
// GET /api/stock/report?productType=... → รายงานคงเหลือของประเภทนั้น
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const productType = new URL(req.url).searchParams.get('productType')?.trim() || ''
  const [productTypes, products] = await Promise.all([productTypesWithComponents(), stockProductCounts()])
  const report = productType ? await buildStockReport(productType) : null

  return NextResponse.json({ productTypes, products, report }, { headers: { 'Cache-Control': 'no-store' } })
}
