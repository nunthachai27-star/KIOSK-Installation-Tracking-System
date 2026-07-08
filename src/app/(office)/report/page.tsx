import Link from 'next/link'
import { getDailySummary } from '@/lib/daily-summary'
import { dayRangeLocal } from '@/lib/activity'

const dateTitle = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function parseDateParam(d?: string): Date {
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return new Date()
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams
  const day = parseDateParam(d)
  const { from, to } = dayRangeLocal(day)
  const summary = await getDailySummary(from, to)

  const prev = new Date(day); prev.setDate(day.getDate() - 1)
  const next = new Date(day); next.setDate(day.getDate() + 1)
  const grandTotal = summary.reduce((s, x) => s + x.total, 0)

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">สรุปงานรายวัน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">{dateTitle.format(day)} · {summary.length} คน · {grandTotal} รายการ</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/report?d=${ymd(prev)}`} className="w-9 h-9 grid place-items-center rounded-lg bg-[#F0EEEC] hover:bg-[#E7E4E1] font-bold">‹</Link>
          <Link href="/report" className="px-3 h-9 grid place-items-center rounded-lg bg-[#F0EEEC] hover:bg-[#E7E4E1] text-sm font-semibold">วันนี้</Link>
          <Link href={`/report?d=${ymd(next)}`} className="w-9 h-9 grid place-items-center rounded-lg bg-[#F0EEEC] hover:bg-[#E7E4E1] font-bold">›</Link>
        </div>
      </div>

      {summary.length === 0 ? (
        <div className="ds-card p-10 text-center text-[#8492A6]">ไม่มีบันทึกการทำงานในวันนี้</div>
      ) : (
        summary.map((staff) => (
          <div key={staff.staffId} className="ds-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FFEDE1] text-[#EA580C] grid place-items-center font-bold text-sm">
                  {staff.name.trim().charAt(0) || '?'}
                </span>
                <div className="font-bold text-[15px] text-[#1C1917]">{staff.name}</div>
              </div>
              <span className="text-[13px] font-semibold text-[#8492A6]">{staff.total} รายการ</span>
            </div>
            <ul className="flex flex-col gap-2">
              {staff.lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="shrink-0 inline-block bg-[#F4F3F1] text-[#57534E] rounded-md px-2 py-0.5 text-[11.5px] font-semibold">{l.cat}</span>
                  <span className="text-[#3C4A5E]">{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
