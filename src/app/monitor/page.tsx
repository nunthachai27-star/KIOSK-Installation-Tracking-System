import Link from 'next/link'
import { getMonitorQueueForDate, dayRangeLocal, ACTIVITY_ACCENT, ACTIVITY_STATUS } from '@/lib/activity'
import { MonitorRefresh } from '@/components/MonitorRefresh'
import { FullscreenToggle } from '@/components/FullscreenToggle'

const dateTitle = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })

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

export default async function MonitorPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams
  const day = parseDateParam(d)
  const { from, to } = dayRangeLocal(day)
  const queue = await getMonitorQueueForDate(from, to)

  const prev = new Date(day); prev.setDate(day.getDate() - 1)
  const next = new Date(day); next.setDate(day.getDate() + 1)

  // Upcoming week: the next 7 days after the selected day, grouped by date.
  const weekStart = new Date(day); weekStart.setDate(day.getDate() + 1); weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(day); weekEnd.setDate(day.getDate() + 7); weekEnd.setHours(23, 59, 59, 999)
  const weekItems = await getMonitorQueueForDate(weekStart, weekEnd)
  const groupMap = new Map<string, typeof weekItems>()
  for (const it of weekItems) {
    const k = ymd(it.activityDate)
    const arr = groupMap.get(k) ?? []
    arr.push(it)
    groupMap.set(k, arr)
  }
  const weekGroups = [...groupMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, items]) => ({
      key,
      title: weekdayFmt.format(items[0].activityDate),
      items: items.slice().sort((a, b) => (a.allDay ? 1 : 0) - (b.allDay ? 1 : 0) || a.activityDate.getTime() - b.activityDate.getTime()),
    }))

  return (
    <div className="min-h-screen bg-[#1C1917] text-white flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="ds-logo w-11 h-11 rounded-xl grid place-items-center font-bold text-xl">K</span>
          <div>
            <div className="text-2xl font-bold tracking-tight">คิวงานติดตั้ง KIOSK</div>
            <div className="text-[15px] text-white/60">{dateTitle.format(day)} · {queue.length} งาน</div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right text-[15px] text-white/70"><MonitorRefresh /></div>
          <FullscreenToggle />
          <div className="flex gap-2">
            <Link href={`/monitor?d=${ymd(prev)}`} className="w-10 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20">‹</Link>
            <Link href="/monitor" className="px-3 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm">วันนี้</Link>
            <Link href={`/monitor?d=${ymd(next)}`} className="w-10 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20">›</Link>
          </div>
        </div>
      </header>

      {/* board */}
      <div className="flex-1 px-8 py-6 overflow-auto flex flex-col gap-8">
        {queue.length === 0 ? (
          <div className="py-16 text-center text-white/40 text-2xl">ไม่มีคิวงานในวันนี้</div>
        ) : (
          <div className="grid grid-cols-[70px_130px_72px_1.2fr_1.4fr_1fr_180px] gap-x-4 items-center">
            <div className="contents text-white/45 text-[15px] font-semibold uppercase tracking-wide">
              <div className="px-3 py-3">ลำดับ</div>
              <div className="px-3 py-3">เวลา</div>
              <div className="px-3 py-3"></div>
              <div className="px-3 py-3">ประเภทงาน</div>
              <div className="px-3 py-3">โรงพยาบาล</div>
              <div className="px-3 py-3">ผู้รับผิดชอบ</div>
              <div className="px-3 py-3">สถานะ</div>
            </div>
            {queue.map((q, i) => {
              const st = ACTIVITY_STATUS[q.status]
              return (
                <div key={q.id} className="contents">
                  <div className="col-span-7 h-px bg-white/8" />
                  <div className="px-3 py-4 text-2xl font-bold text-white/40 tnum">{i + 1}</div>
                  <div className="px-3 py-4 font-bold tnum">
                    {q.allDay
                      ? <span className="text-xl text-white/55">ทั้งวัน</span>
                      : <span className="text-3xl">{timeFmt.format(q.activityDate)}</span>}
                  </div>
                  <div className="px-3 py-4">
                    <span className="w-12 h-12 rounded-xl grid place-items-center text-[26px] leading-none" style={{ background: `${ACTIVITY_ACCENT[q.activityType]}2E` }}>{q.icon}</span>
                  </div>
                  <div className="px-3 py-4">
                    <span className="text-[26px] font-semibold leading-tight">{q.label}</span>
                    <div className="text-[16px] text-white/50 mt-0.5">{q.productType} ×{q.quantity}</div>
                  </div>
                  <div className="px-3 py-4">
                    <div className="text-[24px] font-semibold leading-tight">{q.hospitalName}</div>
                    <div className="text-[15px] text-white/50">{q.province} · {q.jobCode}</div>
                  </div>
                  <div className="px-3 py-4 text-[22px] font-medium">{q.responsibleName ?? '—'}</div>
                  <div className="px-3 py-4">
                    <span className="inline-block px-4 py-1.5 rounded-full text-[17px] font-bold" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* upcoming week */}
        {weekGroups.length > 0 && (
          <div className="border-t border-white/10 pt-6">
            <div className="text-white/55 text-xl font-bold mb-4">งานสัปดาห์นี้ · {weekItems.length} งาน</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weekGroups.map((g) => (
                <div key={g.key} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="text-[18px] font-bold text-white/85">{g.title}</div>
                    <div className="text-white/40 text-[13px]">{g.items.length} งาน</div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {g.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2.5 text-[16px]">
                        <span className="tnum text-white/55 w-16 shrink-0">{it.allDay ? 'ทั้งวัน' : timeFmt.format(it.activityDate)}</span>
                        <span className="w-7 h-7 rounded-lg grid place-items-center text-[16px] leading-none shrink-0" style={{ background: `${ACTIVITY_ACCENT[it.activityType]}2E` }}>{it.icon}</span>
                        <span className="truncate">
                          <span className="font-semibold">{it.label}</span>
                          <span className="text-white/45"> · {it.hospitalName}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
