import Link from 'next/link'
import { getQueueForDate, dayRangeLocal, ACTIVITY_LABEL, ACTIVITY_ACCENT, ACTIVITY_STATUS } from '@/lib/activity'
import { MonitorRefresh } from '@/components/MonitorRefresh'

const dateTitle = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' })

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
  const queue = await getQueueForDate(from, to)

  const prev = new Date(day); prev.setDate(day.getDate() - 1)
  const next = new Date(day); next.setDate(day.getDate() + 1)

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex flex-col">
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
          <div className="flex gap-2">
            <Link href={`/monitor?d=${ymd(prev)}`} className="w-10 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20">‹</Link>
            <Link href="/monitor" className="px-3 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-sm">วันนี้</Link>
            <Link href={`/monitor?d=${ymd(next)}`} className="w-10 h-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20">›</Link>
          </div>
        </div>
      </header>

      {/* board */}
      <div className="flex-1 px-8 py-6 overflow-auto">
        {queue.length === 0 ? (
          <div className="h-full grid place-items-center text-white/40 text-2xl">ไม่มีคิวงานในวันนี้</div>
        ) : (
          <div className="grid grid-cols-[70px_130px_1.2fr_1.4fr_1fr_180px] gap-x-4 items-center">
            <div className="contents text-white/45 text-[15px] font-semibold uppercase tracking-wide">
              <div className="px-3 py-3">ลำดับ</div>
              <div className="px-3 py-3">เวลา</div>
              <div className="px-3 py-3">ประเภทงาน</div>
              <div className="px-3 py-3">โรงพยาบาล</div>
              <div className="px-3 py-3">ผู้รับผิดชอบ</div>
              <div className="px-3 py-3">สถานะ</div>
            </div>
            {queue.map((q, i) => {
              const st = ACTIVITY_STATUS[q.status]
              return (
                <div key={q.id} className="contents">
                  <div className="col-span-6 h-px bg-white/8" />
                  <div className="px-3 py-4 text-2xl font-bold text-white/40 tnum">{i + 1}</div>
                  <div className="px-3 py-4 text-3xl font-bold tnum">{timeFmt.format(q.activityDate)}</div>
                  <div className="px-3 py-4">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ background: ACTIVITY_ACCENT[q.activityType] }} />
                      <span className="text-[26px] font-semibold leading-tight">{ACTIVITY_LABEL[q.activityType]}</span>
                    </span>
                    <div className="text-[16px] text-white/50 mt-0.5 pl-[22px]">{q.job.productType} ×{q.job.quantity}</div>
                  </div>
                  <div className="px-3 py-4">
                    <div className="text-[24px] font-semibold leading-tight">{q.job.hospital.name}</div>
                    <div className="text-[15px] text-white/50">{q.job.province} · {q.job.jobCode}</div>
                  </div>
                  <div className="px-3 py-4 text-[22px] font-medium">{q.responsibleUser?.name ?? '—'}</div>
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
      </div>
    </div>
  )
}
