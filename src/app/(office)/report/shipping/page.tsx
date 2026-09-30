import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getShippingCostReport, DEFAULT_SHIP_METHOD } from '@/lib/shipping-report'
import { ShippingCostReport, type ShipRowC } from '@/components/ShippingCostReport'

export const dynamic = 'force-dynamic'

export default async function ShippingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; method?: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const sp = await searchParams
  const method = sp.method || DEFAULT_SHIP_METHOD

  // เดือนเริ่มต้น: ล่าสุดที่มีข้อมูล (ถ้าไม่ได้ระบุ) — ดึงรายการเดือนก่อนด้วยเดือนปัจจุบัน
  const now = new Date()
  const probe = await getShippingCostReport(now.getFullYear(), now.getMonth(), method)
  const def = probe.months[0] ?? { year: now.getFullYear(), month: now.getMonth() }

  const y = sp.y ? Number(sp.y) : def.year
  const m = sp.m != null ? Number(sp.m) : def.month
  const report =
    y === now.getFullYear() && m === now.getMonth() ? probe : await getShippingCostReport(y, m, method)

  const rows: ShipRowC[] = report.rows.map((r) => ({
    hospital: r.hospital, province: r.province, item: r.item, qty: r.qty,
    estCost: r.estCost, shippedDate: r.shippedDate.toISOString(),
    provinceSpan: r.provinceSpan, hospitalSpan: r.hospitalSpan,
  }))

  return (
    <div className="p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm print:hidden">
        <Link href="/report" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ รายงาน</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">ฟอร์มค่าขนส่ง</h1>
      </div>
      <ShippingCostReport
        rows={rows}
        year={report.year}
        month={report.month}
        method={report.method}
        totalQty={report.totalQty}
        totalEst={report.totalEst}
        hasEst={report.hasEst}
        months={report.months}
      />
    </div>
  )
}
