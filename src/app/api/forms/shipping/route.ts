import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getShippingCostReport, DEFAULT_SHIP_METHOD } from '@/lib/shipping-report'

export const dynamic = 'force-dynamic'

// ดึงรายการค่าขนส่งรายเดือน ให้ฟอร์มในแถบแบบฟอร์ม (ฝั่ง client) เอาไปเติมตาราง
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const method = url.searchParams.get('method') || DEFAULT_SHIP_METHOD
  const yParam = url.searchParams.get('y')
  const mParam = url.searchParams.get('m')

  const now = new Date()
  // ถ้าไม่ระบุเดือน → ใช้เดือนล่าสุดที่มีข้อมูล
  const probe = await getShippingCostReport(now.getFullYear(), now.getMonth(), method)
  const def = probe.months[0] ?? { year: now.getFullYear(), month: now.getMonth() }
  const y = yParam ? Number(yParam) : def.year
  const m = mParam != null ? Number(mParam) : def.month
  const report =
    y === now.getFullYear() && m === now.getMonth() ? probe : await getShippingCostReport(y, m, method)

  return NextResponse.json({
    method: report.method,
    year: report.year,
    month: report.month,
    months: report.months,
    totalQty: report.totalQty,
    totalEst: report.totalEst,
    hasEst: report.hasEst,
    rows: report.rows.map((r) => ({
      hospital: r.hospital, province: r.province, item: r.item, qty: r.qty,
      estCost: r.estCost, shippedDate: r.shippedDate.toISOString(),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
