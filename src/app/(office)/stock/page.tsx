import Link from 'next/link'
import { getStockSummary } from '@/lib/stock'
import { StockDashboard } from '@/components/StockDashboard'

export default async function StockPage() {
  const { kpi, groups } = await getStockSummary()
  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">📦</span>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">คลังสินค้า</h1>
            <p className="text-[13px] text-[#8492A6] mt-0.5">สต็อกอุปกรณ์ของฝ่าย · รับเข้า / จ่ายออก / คงเหลือ แยกตามรุ่นและ Lot · แจ้งเตือนสินค้าใกล้หมด</p>
          </div>
        </div>
        <Link href="/stock/new" className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#C2410C] shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]">
          ＋ เพิ่มสินค้า / รับเข้า
        </Link>
      </div>
      <StockDashboard kpi={kpi} groups={groups} />
    </div>
  )
}
