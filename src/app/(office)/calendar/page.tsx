import Link from 'next/link'
import { getCalendarEvents, latestEventDate, monthGrid, ymKey, KIND_META, type CalEvent } from '@/lib/calendar'

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const monthTitle = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams

  // Which month to show: ?m=YYYY-MM, else the latest month with data, else now.
  let year: number, month0: number
  const parsed = m && /^\d{4}-\d{2}$/.test(m) ? m.split('-').map(Number) : null
  if (parsed) {
    year = parsed[0]
    month0 = parsed[1] - 1
  } else {
    const latest = (await latestEventDate()) ?? new Date()
    year = latest.getUTCFullYear()
    month0 = latest.getUTCMonth()
  }

  const { days, from, to } = monthGrid(year, month0)
  const events = await getCalendarEvents(from, to)

  const byDay = new Map<string, CalEvent[]>()
  for (const e of events) {
    const k = dayKey(e.date)
    const arr = byDay.get(k) ?? []
    arr.push(e)
    byDay.set(k, arr)
  }

  const cur = new Date(Date.UTC(year, month0, 1))
  const prev = ymKey(new Date(Date.UTC(year, month0 - 1, 1)))
  const next = ymKey(new Date(Date.UTC(year, month0 + 1, 1)))
  const todayKey = dayKey(new Date())

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#12233B]">ปฏิทินงาน</h1>
          <span className="text-sm text-[#8492A6]">{events.length} เหตุการณ์เดือนนี้</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?m=${prev}`} className="w-9 h-9 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F6F9FC]">‹</Link>
          <span className="min-w-[150px] text-center font-semibold text-[#12233B]">{monthTitle.format(cur)}</span>
          <Link href={`/calendar?m=${next}`} className="w-9 h-9 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F6F9FC]">›</Link>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(KIND_META).map(([k, meta]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[12.5px] text-[#5A6B82]">
            <span className="w-3 h-3 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>

      {/* calendar grid */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-[#F6F9FC] border-b border-[#E7EDF4]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-3 py-2 text-center text-[12.5px] font-semibold text-[#5A6B82]">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = d.getUTCMonth() === month0
            const k = dayKey(d)
            const dayEvents = byDay.get(k) ?? []
            const isToday = k === todayKey
            return (
              <div
                key={i}
                className={`min-h-[104px] border-b border-r border-[#F1F5F9] p-1.5 ${inMonth ? 'bg-white' : 'bg-[#FBFCFE]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex justify-end">
                  <span
                    className={`text-[12px] w-6 h-6 grid place-items-center rounded-full ${isToday ? 'bg-[#2F6BED] text-white font-bold' : inMonth ? 'text-[#12233B]' : 'text-[#B7C1CE]'}`}
                  >
                    {d.getUTCDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => {
                    const meta = KIND_META[e.kind]
                    return (
                      <Link
                        key={j}
                        href={`/jobs/${e.jobId}`}
                        title={`${meta.label} · ${e.hospital} (${e.province})`}
                        className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {e.hospital}
                      </Link>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[11px] text-[#8492A6] pl-1">+{dayEvents.length - 3} เพิ่มเติม</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
