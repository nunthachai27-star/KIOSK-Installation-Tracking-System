import Link from 'next/link'
import { getCalendarEvents, latestEventDate, monthGrid, ymKey, KIND_META, type CalEvent, type CalKind } from '@/lib/calendar'
import { CalendarSearch } from '@/components/CalendarSearch'

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const monthTitle = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })
const dayLabel = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: '2-digit', month: 'short' })
const shortDate = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const KIND_ORDER: CalKind[] = ['shipped', 'arrived', 'remote', 'due']

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; q?: string; kind?: string; view?: string }> }) {
  const { m, q: rawQ, kind: rawKind, view } = await searchParams
  const q = (rawQ ?? '').trim()
  const ql = q.toLowerCase()
  const kind = (KIND_ORDER as string[]).includes(rawKind ?? '') ? (rawKind as CalKind) : ''
  const isList = view === 'list'

  // Which month to show: ?m=YYYY-MM, else the latest month with data, else now.
  let year: number, month0: number
  const parsed = m && /^\d{4}-\d{2}$/.test(m) ? m.split('-').map(Number) : null
  if (parsed) { year = parsed[0]; month0 = parsed[1] - 1 }
  else { const latest = (await latestEventDate()) ?? new Date(); year = latest.getUTCFullYear(); month0 = latest.getUTCMonth() }

  const { days, from, to } = monthGrid(year, month0)

  // Near-deadline window (independent of the shown month).
  const todayMs = utcMidnight(new Date())
  const nearFrom = new Date(todayMs - 30 * 86400000)
  const nearTo = new Date(todayMs + 60 * 86400000)

  const [monthEventsAll, nearAll] = await Promise.all([
    getCalendarEvents(from, to),
    getCalendarEvents(nearFrom, nearTo),
  ])

  const matchQ = (e: CalEvent) => !ql || e.hospital.toLowerCase().includes(ql) || e.province.toLowerCase().includes(ql)
  const monthEvents = monthEventsAll.filter(matchQ)
  const gridEvents = kind ? monthEvents.filter((e) => e.kind === kind) : monthEvents

  // Summary counts for the month (all kinds, respects search).
  const summary = KIND_ORDER.map((k) => ({ k, count: monthEvents.filter((e) => e.kind === k).length }))

  const byDay = new Map<string, CalEvent[]>()
  for (const e of gridEvents) { const k = dayKey(e.date); (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(e) }

  // Near-deadline list: a couple recent-overdue + upcoming, closest first.
  const near = nearAll.filter(matchQ).filter((e) => !kind || e.kind === kind).sort((a, b) => a.date.getTime() - b.date.getTime())
  const overdue = near.filter((e) => utcMidnight(e.date) < todayMs).slice(-2)
  const upcoming = near.filter((e) => utcMidnight(e.date) >= todayMs)
  const nearItems = [...overdue, ...upcoming].slice(0, 6)
  const diffDays = (d: Date) => Math.round((utcMidnight(d) - todayMs) / 86400000)

  const cur = new Date(Date.UTC(year, month0, 1))
  const prev = ymKey(new Date(Date.UTC(year, month0 - 1, 1)))
  const next = ymKey(new Date(Date.UTC(year, month0 + 1, 1)))
  const todayKey = dayKey(new Date())

  const buildHref = (over: { m?: string; kind?: string; view?: string }) => {
    const p = new URLSearchParams()
    p.set('m', over.m ?? ymKey(cur))
    if (q) p.set('q', q)
    const kd = over.kind !== undefined ? over.kind : kind
    if (kd) p.set('kind', kd)
    const vw = over.view !== undefined ? over.view : (isList ? 'list' : '')
    if (vw) p.set('view', vw)
    return `/calendar?${p.toString()}`
  }

  const viewBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-lg ${active ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`

  return (
    <div className="p-4 sm:p-6 max-w-[1220px] mx-auto flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-[#1C1917]">ปฏิทินงาน</h1>
          <span className="text-[13px] text-[#8492A6]">{monthEvents.length} เหตุการณ์เดือนนี้</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarSearch initial={q} />
          {/* kind filter dropdown (native details — no JS) */}
          <details className="relative">
            <summary className="list-none cursor-pointer flex items-center gap-1.5 border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#5A6B82] hover:bg-[#F4F3F1]">
              ⛃ ตัวกรอง{kind && <span className="w-1.5 h-1.5 rounded-full" style={{ background: KIND_META[kind].color }} />}
            </summary>
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#ECEFF3] rounded-xl shadow-[0_12px_40px_-12px_rgba(18,45,90,0.3)] p-1.5 z-20">
              <Link href={buildHref({ kind: '' })} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] ${!kind ? 'bg-[#FFEDE1] text-[#EA580C] font-semibold' : 'text-[#5A6B82] hover:bg-[#F6F4F2]'}`}>ทุกประเภท</Link>
              {KIND_ORDER.map((k) => (
                <Link key={k} href={buildHref({ kind: k })} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] ${kind === k ? 'bg-[#FFEDE1] text-[#EA580C] font-semibold' : 'text-[#5A6B82] hover:bg-[#F6F4F2]'}`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_META[k].color }} />{KIND_META[k].label}
                </Link>
              ))}
            </div>
          </details>
          <div className="flex items-center gap-1 border border-[#D6DFEA] rounded-lg p-0.5">
            <Link href={buildHref({ view: '' })} className={viewBtn(!isList)}>📅 เดือน</Link>
            <Link href={buildHref({ view: 'list' })} className={viewBtn(isList)}>☰ รายการ</Link>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {KIND_ORDER.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[12.5px] text-[#5A6B82]">
            <span className="w-3 h-3 rounded-full" style={{ background: KIND_META[k].color }} />{KIND_META[k].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-4 items-start">
        {/* left: calendar / list */}
        <div className="min-w-0 flex flex-col gap-3">
          {/* month nav */}
          <div className="flex items-center justify-center gap-2">
            <Link href={buildHref({ m: prev })} className="w-9 h-9 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F6F9FC]">‹</Link>
            <span className="min-w-[160px] text-center font-bold text-[15px] text-[#1C1917]">{monthTitle.format(cur)}</span>
            <Link href={buildHref({ m: next })} className="w-9 h-9 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F6F9FC]">›</Link>
          </div>

          {isList ? (
            <div className="ds-card overflow-hidden">
              {gridEvents.length === 0 ? (
                <div className="px-5 py-8 text-sm text-[#8492A6] text-center">ไม่มีเหตุการณ์</div>
              ) : (
                [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, evs]) => (
                  <div key={k} className="border-t border-[#F1F5F9] first:border-t-0">
                    <div className="px-5 py-2 bg-[#FBFAF8] text-[12.5px] font-semibold text-[#57534E]">{dayLabel.format(evs[0].date)}</div>
                    {evs.map((e, j) => {
                      const meta = KIND_META[e.kind]
                      return (
                        <Link key={j} href={`/jobs/${e.jobId}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#F8FAFD]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                          <span className="flex-1 text-[13px] font-medium text-[#1C1917] truncate">{e.hospital}</span>
                          <span className="text-[11.5px] px-2 py-0.5 rounded-md font-semibold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 bg-[#F6F9FC] border-b border-[#E7EDF4]">
                {WEEKDAYS.map((w) => <div key={w} className="px-3 py-2 text-center text-[12.5px] font-semibold text-[#5A6B82]">{w}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const inMonth = d.getUTCMonth() === month0
                  const k = dayKey(d)
                  const dayEvents = byDay.get(k) ?? []
                  const isToday = k === todayKey
                  return (
                    <div key={i} className={`min-h-[104px] border-b border-r border-[#F1F5F9] p-1.5 ${inMonth ? 'bg-white' : 'bg-[#FBFCFE]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                      <div className="flex justify-end">
                        <span className={`text-[12px] w-6 h-6 grid place-items-center rounded-full ${isToday ? 'bg-[#EA580C] text-white font-bold' : inMonth ? 'text-[#1C1917]' : 'text-[#B7C1CE]'}`}>{d.getUTCDate()}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-0.5">
                        {dayEvents.slice(0, 3).map((e, j) => {
                          const meta = KIND_META[e.kind]
                          return (
                            <Link key={j} href={`/jobs/${e.jobId}`} title={`${meta.label} · ${e.hospital} (${e.province})`}
                              className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: meta.bg, color: meta.color }}>
                              {e.hospital}
                            </Link>
                          )
                        })}
                        {dayEvents.length > 3 && <span className="text-[11px] text-[#8492A6] pl-1">+{dayEvents.length - 3} เพิ่มเติม</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* footer hint */}
          <div className="ds-card px-5 py-3 flex items-center gap-4 flex-wrap text-[12px] text-[#8492A6]">
            <span className="inline-flex items-center gap-1.5">ℹ️ คลิกที่เหตุการณ์เพื่อดูรายละเอียดงาน</span>
            <span className="w-px h-4 bg-[#ECEFF3]" />
            <span className="inline-flex items-center gap-1.5">📅 เลือกเดือนด้วยปุ่ม ‹ › ด้านบน</span>
          </div>
        </div>

        {/* right sidebar */}
        <div className="flex flex-col gap-4">
          <div className="ds-card p-5">
            <div className="text-[14px] font-bold mb-3">สรุปเดือนนี้</div>
            <div className="flex flex-col gap-3">
              {summary.map(({ k, count }) => (
                <div key={k} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: KIND_META[k].color }} />
                  <span className="flex-1 text-[13px] text-[#3C4A5E]">{KIND_META[k].label}</span>
                  <span className="text-[18px] font-bold tnum" style={{ color: KIND_META[k].color }}>{count}</span>
                  <span className="text-[11px] text-[#A8A29E]">รายการ</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ds-card p-5">
            <div className="text-[14px] font-bold mb-3">เหตุการณ์ใกล้ถึงกำหนด</div>
            {nearItems.length === 0 ? (
              <div className="text-[12.5px] text-[#8492A6]">ไม่มีเหตุการณ์ใกล้กำหนด</div>
            ) : (
              <div className="flex flex-col gap-3">
                {nearItems.map((e, j) => {
                  const meta = KIND_META[e.kind]
                  const d = diffDays(e.date)
                  const badge = d > 0 ? { t: `อีก ${d} วัน`, c: '#B45309', b: '#FBEBCB' } : d === 0 ? { t: 'วันนี้', c: '#157F4C', b: '#E2F3EA' } : { t: `เลยกำหนด ${-d} วัน`, c: '#C13540', b: '#FBE4E4' }
                  return (
                    <Link key={j} href={`/jobs/${e.jobId}`} className="flex items-start gap-2.5 group">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: meta.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#1C1917] truncate group-hover:text-[#EA580C]">{e.hospital}</div>
                        <div className="text-[11.5px] text-[#8492A6] mt-0.5">📅 {shortDate.format(e.date)}</div>
                      </div>
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap" style={{ background: badge.b, color: badge.c }}>{badge.t}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
