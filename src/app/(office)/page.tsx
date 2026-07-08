import Link from 'next/link'
import { getSummary, getJobList, countClosed, getProductTypes, getContractYears, countPlanned } from '@/lib/dashboard'
import { stepForStatus } from '@/lib/status'
import { StatStrip } from '@/components/StatStrip'
import { JobRow } from '@/components/JobRow'
import { JobFilters } from '@/components/JobFilters'
import { formatQty } from '@/lib/format'

// Workflow steps 1-6, matching the job-detail step nav.
const STEP_LABELS = ['ข้อมูลงาน', 'ลง Serial', 'QC', 'งานจัดส่ง', 'ติดตั้ง & ส่งมอบ', 'งานบิล']

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; type?: string; year?: string; step?: string }>
}) {
  const sp = await searchParams
  const showAll = sp.all === '1'
  const type = sp.type ?? ''
  const year = /^\d{4}$/.test(sp.year ?? '') ? (sp.year as string) : ''
  const stepNum = /^[1-6]$/.test(sp.step ?? '') ? Number(sp.step) : 0 // 0 = ทั้งหมด

  const now = new Date()
  const [s, jobs, closed, productTypes, years, planned] = await Promise.all([
    getSummary(now),
    getJobList({
      includeClosed: showAll,
      productType: type || undefined,
      year: year ? Number(year) : undefined,
      planned: false,
    }),
    countClosed(),
    getProductTypes(),
    getContractYears(),
    countPlanned(),
  ])

  const items = [
    { label: 'งานทั้งหมด', value: formatQty(s.total) },
    { label: 'พร้อมจัดส่ง', value: formatQty(s.toShip) },
    { label: 'รอส่งมอบ', value: formatQty(s.toHandover) },
    { label: 'เลยกำหนด', value: formatQty(s.overdue), warn: s.overdue > 0 },
  ]

  // Tally the current (type/year/open) scope by workflow step for the side menu.
  const stepCounts = [0, 0, 0, 0, 0, 0]
  for (const j of jobs) stepCounts[stepForStatus(j.currentStatus) - 1]++

  const displayed = stepNum ? jobs.filter((j) => stepForStatus(j.currentStatus) === stepNum) : jobs

  // Build step-menu / toggle hrefs preserving the active type/year/open scope.
  const buildHref = (over: { step?: number; all?: boolean }) => {
    const p = new URLSearchParams()
    if (type) p.set('type', type)
    if (year) p.set('year', year)
    const all = over.all !== undefined ? over.all : showAll
    if (all) p.set('all', '1')
    const st = over.step !== undefined ? over.step : stepNum
    if (st) p.set('step', String(st))
    const qs = p.toString()
    return qs ? `/?${qs}` : '/'
  }

  const stepItem = (active: boolean) =>
    `shrink-0 md:shrink flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      active ? 'bg-[#EA580C] text-white shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]' : 'text-[#57534E] hover:bg-[#F0EEEC]'
    }`
  const badge = (active: boolean) =>
    `ml-auto min-w-[24px] text-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tnum ${
      active ? 'bg-white/25 text-white' : 'bg-[#ECEAE8] text-[#78716C]'
    }`
  const numDot = (active: boolean) =>
    `w-6 h-6 shrink-0 rounded-full grid place-items-center text-[12px] font-bold ${
      active ? 'bg-white/25 text-white' : 'bg-[#ECEAE8] text-[#A8A29E]'
    }`

  const tab = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${active ? 'bg-[#FFEDE1] text-[#EA580C]' : 'text-[#5A6B82] hover:bg-[#F6F9FC]'}`

  const heading = stepNum ? `${stepNum}. ${STEP_LABELS[stepNum - 1]}` : 'งานทั้งหมด'

  return (
    <div className="p-4 sm:p-6 max-w-[1220px] mx-auto flex flex-col gap-4">
      <StatStrip items={items} />

      <div className="flex flex-col md:flex-row md:items-start md:gap-4">
        {/* left: workflow-step menu */}
        <nav
          aria-label="จัดกลุ่มตามขั้นตอนงาน"
          className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible md:w-56 md:shrink-0 pb-1 md:pb-0"
        >
          <Link href={buildHref({ step: 0 })} aria-current={stepNum === 0 ? 'page' : undefined} className={stepItem(stepNum === 0)}>
            <span>ทั้งหมด</span>
            <span className={badge(stepNum === 0)}>{formatQty(jobs.length)}</span>
          </Link>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const active = stepNum === n
            return (
              <Link key={n} href={buildHref({ step: n })} aria-current={active ? 'page' : undefined} className={stepItem(active)}>
                <span className={numDot(active)}>{n}</span>
                <span>{label}</span>
                <span className={badge(active)}>{formatQty(stepCounts[i])}</span>
              </Link>
            )
          })}
        </nav>

        {/* right: job list */}
        <div className="flex-1 min-w-0 ds-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
            <div className="text-[15px] font-bold">
              {heading} · {formatQty(displayed.length)} รายการ
              {!showAll && closed > 0 && (
                <span className="ml-2 text-[12.5px] font-normal text-[#8492A6]">ซ่อนงานที่ปิดแล้ว {formatQty(closed)} รายการ</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <JobFilters productTypes={productTypes} years={years} type={type} year={year} showAll={showAll} step={stepNum ? String(stepNum) : ''} />
              <div className="flex gap-1">
                <Link href={buildHref({ all: false })} className={tab(!showAll)}>ยังไม่ปิดงาน</Link>
                <Link href={buildHref({ all: true })} className={tab(showAll)}>แสดงทั้งหมด</Link>
              </div>
              {planned > 0 && (
                <Link href="/planned" className="text-[12.5px] font-semibold text-[#EA580C] hover:underline">
                  งานตามแผน {formatQty(planned)} รายการ ›
                </Link>
              )}
            </div>
          </div>
          {displayed.length > 0 ? (
            displayed.map((j) => <JobRow key={j.id} job={j} />)
          ) : (
            <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#F1F5F9]">
              {stepNum ? `ไม่มีงานในขั้นตอน "${STEP_LABELS[stepNum - 1]}"` : 'ไม่มีงาน'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
