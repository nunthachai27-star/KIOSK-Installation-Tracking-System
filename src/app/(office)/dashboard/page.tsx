import { getDashboardData } from '@/lib/dashboard'
import { MonthlyBars } from '@/components/MonthlyBars'
import { DashboardYearFilter } from '@/components/DashboardYearFilter'

const nf = new Intl.NumberFormat('th-TH')
const compactBaht = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : nf.format(Math.round(n))
const fullBaht = (n: number) => `${nf.format(Math.round(n))} ฿`

// % change vs previous month, for the KPI tiles.
function pctChange(cur: number, prev: number | null): { color: string; text: string } | null {
  if (prev == null) return null
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return { color: '#157F4C', text: '▲ ใหม่' }
  const p = Math.round(((cur - prev) / prev) * 100)
  if (p === 0) return { color: '#94A3B8', text: '0% เทียบเดือนก่อน' }
  return p > 0
    ? { color: '#157F4C', text: `▲ +${p}% เทียบเดือนก่อน` }
    : { color: '#C13540', text: `▼ ${p}% เทียบเดือนก่อน` }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const yearCE = /^\d{4}$/.test(sp.year ?? '') ? Number(sp.year) : undefined
  const { years, year, orders, revenue } = await getDashboardData(yearCE)

  // "เดือนล่าสุด" = last month in the year that has any activity (else December).
  let latest = -1
  for (let i = 0; i < 12; i++) if (orders[i] > 0 || revenue[i] > 0) latest = i
  const hasData = latest >= 0
  const mi = hasData ? latest : 11
  const prevOrders = mi > 0 ? orders[mi - 1] : null
  const prevRevenue = mi > 0 ? revenue[mi - 1] : null

  const totalOrders = orders.reduce((a, b) => a + b, 0)
  const totalRevenue = revenue.reduce((a, b) => a + b, 0)
  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

  const oChange = hasData ? pctChange(orders[mi], prevOrders) : null
  const rChange = hasData ? pctChange(revenue[mi], prevRevenue) : null

  const kpi = [
    { label: `Order เดือนล่าสุด (${hasData ? monthNames[mi] : '—'})`, value: hasData ? nf.format(orders[mi]) : '—', change: oChange, bg: '#EEF3FA', icon: '📄' },
    { label: `ยอดขายเดือนล่าสุด (${hasData ? monthNames[mi] : '—'})`, value: hasData ? fullBaht(revenue[mi]) : '—', change: rChange, bg: '#FFF3E9', icon: '💰' },
    { label: `Order รวมทั้งปี ${year + 543}`, value: nf.format(totalOrders), change: null, bg: '#E2F3EA', icon: '📦' },
    { label: `ยอดขายรวมทั้งปี ${year + 543}`, value: fullBaht(totalRevenue), change: null, bg: '#F3EEFB', icon: '📈' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-5">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">📊</span>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">แดชบอร์ด</h1>
            <p className="text-[13px] text-[#8492A6] mt-0.5">ภาพรวม Order และยอดขายรายเดือน (นับตามวันลงข้อมูลงาน · ไม่รวมงานตามแผน/งานยกเลิก)</p>
          </div>
        </div>
        <DashboardYearFilter years={years} year={year} />
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpi.map((c) => (
          <div key={c.label} className="ds-card px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-[15px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
              <div className="text-[12px] font-semibold text-[#8492A6] leading-tight">{c.label}</div>
            </div>
            <div className="text-[22px] leading-none font-bold tnum mt-2.5 text-[#1C1917]">{c.value}</div>
            <div className="text-[11.5px] font-bold mt-1.5 h-4" style={{ color: c.change?.color ?? 'transparent' }}>
              {c.change?.text ?? '·'}
            </div>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="ds-card p-8 text-center text-[#8492A6] text-sm">ยังไม่มีข้อมูลงานในปี {year + 543}</div>
      )}

      {/* Chart 1 — orders */}
      <div className="ds-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px]">📊</span>
          <h2 className="text-[15px] font-bold text-[#1C1917]">จำนวน Order รายเดือน</h2>
          <span className="text-[12.5px] text-[#8492A6]">· ปี {year + 543}</span>
        </div>
        <MonthlyBars values={orders} format={(n) => nf.format(n)} />
      </div>

      {/* Chart 2 — revenue (same year, same month axis → aligned with chart 1) */}
      <div className="ds-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px]">💰</span>
          <h2 className="text-[15px] font-bold text-[#1C1917]">ยอดขายรายเดือน (บาท)</h2>
          <span className="text-[12.5px] text-[#8492A6]">· ปี {year + 543} · แกนเดือนตรงกับกราฟบน</span>
        </div>
        <MonthlyBars values={revenue} format={compactBaht} />
      </div>
    </div>
  )
}
