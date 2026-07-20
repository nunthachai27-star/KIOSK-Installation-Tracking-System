import Link from 'next/link'
import type { ReactNode } from 'react'
import { getSummary, getJobList, countClosed, getProductTypes, getContractYears, countPlanned } from '@/lib/dashboard'
import { prisma } from '@/lib/prisma'
import { stepForStatus } from '@/lib/status'
import { JobRow } from '@/components/JobRow'
import { JobFilters } from '@/components/JobFilters'
import { JobSearch } from '@/components/JobSearch'
import { formatQty } from '@/lib/format'

// Workflow steps 1-6, matching the job-detail step nav.
const STEP_LABELS = ['ข้อมูลงาน', 'ลง Serial', 'QC', 'งานจัดส่ง', 'ติดตั้ง & ส่งมอบ', 'งานบิล']
const STEP_ICONS = ['📄', '🏷️', '🛡️', '🚚', '🔧', '📋']
// Shared with JobRow's desktop grid — keep column widths in sync.
const JOB_GRID = 'grid-cols-[1.7fr_1.2fr_150px_180px_96px_28px]'
const PER_PAGE = 10

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; type?: string; year?: string; step?: string; q?: string; page?: string; closed?: string }>
}) {
  const sp = await searchParams
  const showAll = sp.all === '1'
  const closedMode = sp.closed === '1' // "ปิดงานแล้ว" group
  const type = sp.type ?? ''
  const year = /^\d{4}$/.test(sp.year ?? '') ? (sp.year as string) : ''
  const stepNum = !closedMode && /^[1-6]$/.test(sp.step ?? '') ? Number(sp.step) : 0 // 0 = ทั้งหมด
  const q = (sp.q ?? '').trim()
  const page = Math.max(1, /^\d+$/.test(sp.page ?? '') ? Number(sp.page) : 1)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [s, jobs, closed, productTypes, years, planned, newThisMonth, closedJobs] = await Promise.all([
    getSummary(now),
    getJobList({ includeClosed: showAll, productType: type || undefined, year: year ? Number(year) : undefined, planned: false }),
    countClosed(),
    getProductTypes(),
    getContractYears(),
    countPlanned(),
    prisma.job.count({ where: { isPlanned: false, createdAt: { gte: monthStart } } }),
    closedMode ? getJobList({ status: 'CLOSED', productType: type || undefined, year: year ? Number(year) : undefined, planned: false }) : Promise.resolve([]),
  ])

  const ql = q.toLowerCase()
  const applyQ = (list: typeof jobs) => (ql ? list.filter((j) => [j.hospital.name, j.jobCode, j.province, j.productType].some((v) => (v ?? '').toLowerCase().includes(ql))) : list)
  const openFiltered = applyQ(jobs)

  // Step counts always reflect the OPEN pipeline (so the menu stays meaningful in closed view).
  const stepCounts = [0, 0, 0, 0, 0, 0]
  for (const j of openFiltered) stepCounts[stepForStatus(j.currentStatus) - 1]++

  const displayed = closedMode
    ? applyQ(closedJobs)
    : stepNum ? openFiltered.filter((j) => stepForStatus(j.currentStatus) === stepNum) : openFiltered
  const totalRows = displayed.length
  const pageCount = Math.max(1, Math.ceil(totalRows / PER_PAGE))
  const curPage = Math.min(page, pageCount)
  const pageItems = displayed.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE)
  const rangeFrom = totalRows === 0 ? 0 : (curPage - 1) * PER_PAGE + 1
  const rangeTo = Math.min(curPage * PER_PAGE, totalRows)

  // Build hrefs preserving the active scope (type/year/open/step/q/page/closed).
  const buildHref = (over: { step?: number; all?: boolean; page?: number; closed?: boolean }) => {
    const p = new URLSearchParams()
    if (type) p.set('type', type)
    if (year) p.set('year', year)
    if (q) p.set('q', q)
    const cl = over.closed !== undefined ? over.closed : closedMode
    if (cl) p.set('closed', '1')
    const all = over.all !== undefined ? over.all : showAll
    if (all && !cl) p.set('all', '1')
    const st = cl ? 0 : (over.step !== undefined ? over.step : stepNum)
    if (st) p.set('step', String(st))
    const pg = over.page !== undefined ? over.page : curPage
    if (pg > 1) p.set('page', String(pg))
    const qs = p.toString()
    return qs ? `/?${qs}` : '/'
  }

  const heading = closedMode ? 'ปิดงานแล้ว' : stepNum ? `${stepNum}. ${STEP_LABELS[stepNum - 1]}` : 'งานทั้งหมด'

  const stats = [
    { icon: '📋', tint: '#1B5FD9', bg: '#E4EEFF', label: 'งานทั้งหมด', value: formatQty(s.total), sub: newThisMonth > 0 ? `↑ เพิ่มขึ้น ${formatQty(newThisMonth)} จากเดือนก่อน` : 'เท่าเดิมจากเดือนก่อน' },
    { icon: '🛒', tint: '#157F4C', bg: '#E2F3EA', label: 'พร้อมจัดส่ง', value: formatQty(s.toShip), sub: s.toShip > 0 ? 'พร้อมส่งทันที' : 'ยังไม่มีงานพร้อมส่ง' },
    { icon: '🚚', tint: '#6D28D9', bg: '#F3EEFF', label: 'รอติดตั้ง/ส่งมอบ', value: formatQty(s.toHandover), sub: 'อยู่ระหว่างดำเนินการ' },
    { icon: '⛔', tint: '#C13540', bg: '#FBE4E4', label: 'เกินกำหนด', value: formatQty(s.overdue), sub: s.overdue > 0 ? 'ต้องเร่งติดตาม' : 'ไม่มีค้าง', warn: s.overdue > 0 },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-[1220px] mx-auto flex flex-col gap-4">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((c) => (
          <div key={c.label} className="ds-card ds-hover ds-lift px-5 py-4 relative overflow-hidden">
            {c.warn && <span className="absolute inset-x-0 top-0 h-[3px] bg-[#C13540]/70" />}
            <div className="flex items-start justify-between gap-2">
              <div className="text-[12.5px] font-semibold text-[#8492A6]">{c.label}</div>
              <span className="w-9 h-9 rounded-xl grid place-items-center text-[16px]" style={{ background: c.bg }}>{c.icon}</span>
            </div>
            <div className="text-[30px] leading-none font-bold mt-2 tracking-tight tnum" style={{ color: c.warn ? '#C13540' : '#1C1917' }}>{c.value}</div>
            <div className="text-[11.5px] text-[#8492A6] mt-1.5">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:gap-4">
        {/* left: workflow-step menu */}
        <div className="md:w-[220px] md:shrink-0 flex flex-col gap-3">
          <nav aria-label="จัดกลุ่มตามขั้นตอนงาน" className="ds-card p-3">
            <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-[#F1F3F6]">
              <span className="text-[12.5px] font-bold text-[#57534E]">ขั้นตอนการทำงาน</span>
              <span className="min-w-[24px] text-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tnum bg-[#FFEDE1] text-[#EA580C]">{formatQty(openFiltered.length)}</span>
            </div>
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              <StepLink href={buildHref({ step: 0, page: 1, closed: false })} active={!closedMode && stepNum === 0} label="ทั้งหมด" count={openFiltered.length} />
              {STEP_LABELS.map((label, i) => (
                <StepLink key={i} href={buildHref({ step: i + 1, page: 1, closed: false })} active={!closedMode && stepNum === i + 1}
                  n={i + 1} icon={STEP_ICONS[i]} label={label} count={stepCounts[i]} />
              ))}
              <div className="my-1 border-t border-[#F1F3F6]" />
              <StepLink href={buildHref({ page: 1, closed: true })} active={closedMode} icon="✅" label="ปิดงานแล้ว" count={closed} />
            </div>
          </nav>
          <Link href="/monitor" className="ds-card ds-hover p-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#EA580C] hover:bg-[#FFF7F2]">
            📊 ดู Pipeline ทั้งหมด
          </Link>
        </div>

        {/* right: job list */}
        <div className="flex-1 min-w-0 ds-card overflow-hidden">
          {/* header: title + search + filter icon */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
            <div className="text-[15px] font-bold shrink-0">
              {heading} · {formatQty(totalRows)} รายการ
              {!showAll && !closedMode && closed > 0 && (
                <span className="ml-2 text-[12.5px] font-normal text-[#8492A6]">ซ่อนงานที่ปิดแล้ว {formatQty(closed)} รายการ</span>
              )}
            </div>
            <JobSearch initial={q} />
          </div>

          {/* filters row */}
          <div className="flex items-center gap-3 flex-wrap px-5 pb-3">
            <JobFilters productTypes={productTypes} years={years} type={type} year={year} showAll={showAll} step={stepNum ? String(stepNum) : ''} />
            {!closedMode && (
              <div className="flex gap-1">
                <Link href={buildHref({ all: false, page: 1 })} className={tab(!showAll)}>🎯 ยังไม่ปิดงาน</Link>
                <Link href={buildHref({ all: true, page: 1 })} className={tab(showAll)}>แสดงทั้งหมด</Link>
              </div>
            )}
            {planned > 0 && (
              <Link href="/planned" className="ml-auto text-[12.5px] font-semibold text-[#EA580C] hover:underline">
                งานตามแผน {formatQty(planned)} รายการ ›
              </Link>
            )}
          </div>

          {/* column header */}
          {pageItems.length > 0 && (
            <div className={`hidden md:grid ${JOB_GRID} items-center gap-2 px-5 py-2 bg-[#FBFAF8] border-y border-[#F1F3F6] text-[11px] font-semibold text-[#A8A29E]`}>
              <div>โรงพยาบาล / เลขที่งาน</div>
              <div>สินค้า / รายการ</div>
              <div>วันที่นัดหมาย</div>
              <div>สถานะขั้นตอน</div>
              <div>อัปเดตล่าสุด</div>
              <div />
            </div>
          )}

          {pageItems.length > 0 ? (
            pageItems.map((j) => <JobRow key={j.id} job={j} />)
          ) : (
            <div className="px-5 py-8 text-sm text-[#8492A6] border-t border-[#F1F5F9]">
              {q ? `ไม่พบงานที่ตรงกับ “${q}”` : closedMode ? 'ยังไม่มีงานที่ปิดแล้ว' : stepNum ? `ไม่มีงานในขั้นตอน "${STEP_LABELS[stepNum - 1]}"` : 'ไม่มีงาน'}
            </div>
          )}

          {/* milestone legend */}
          {pageItems.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-t border-[#F1F3F6] text-[11.5px] text-[#5A6B82]">
              {[['#1B5FD9', 'จัดส่ง'], ['#0B7C86', 'Remote'], ['#157F4C', 'ส่งมอบ'], ['#6D28D9', '🛡 ประกัน']].map(([c, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          )}

          {/* pagination */}
          {totalRows > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-t border-[#F1F3F6]">
              <span className="text-[12.5px] text-[#8492A6]">แสดง {formatQty(rangeFrom)} - {formatQty(rangeTo)} จาก {formatQty(totalRows)} รายการ</span>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <PageLink href={buildHref({ page: Math.max(1, curPage - 1) })} disabled={curPage === 1}>‹</PageLink>
                  {pageNumbers(curPage, pageCount).map((p, i) =>
                    p === 0
                      ? <span key={`e${i}`} className="px-1.5 text-[#C4BFB9]">…</span>
                      : <PageLink key={p} href={buildHref({ page: p })} active={p === curPage}>{formatQty(p)}</PageLink>
                  )}
                  <PageLink href={buildHref({ page: Math.min(pageCount, curPage + 1) })} disabled={curPage === pageCount}>›</PageLink>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const tab = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${active ? 'bg-[#FFEDE1] text-[#EA580C]' : 'text-[#5A6B82] hover:bg-[#F6F9FC]'}`

// Compact page list with ellipses (e.g. 1 … 4 5 6 … 12). 0 marks an ellipsis slot.
function pageNumbers(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = new Set<number>([1, total, cur, cur - 1, cur + 1])
  const arr = [...out].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const res: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) res.push(0)
    res.push(arr[i])
  }
  return res
}

function PageLink({ href, active, disabled, children }: { href: string; active?: boolean; disabled?: boolean; children: ReactNode }) {
  if (disabled) return <span className="min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] text-[#D4CFC9]">{children}</span>
  return (
    <Link href={href} className={`min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold tnum ${active ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F0EEEC]'}`}>
      {children}
    </Link>
  )
}

function StepLink({ href, active, n, icon, label, count }: { href: string; active: boolean; n?: number; icon?: string; label: string; count: number }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`shrink-0 md:shrink flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors border-l-[3px] ${
        active ? 'bg-[#FFF4EC] text-[#EA580C] border-[#EA580C]' : 'text-[#57534E] border-transparent hover:bg-[#F6F4F2]'}`}>
      {n != null ? (
        <span className={`w-5 h-5 shrink-0 rounded-md grid place-items-center text-[11px] font-bold tnum ${active ? 'bg-[#EA580C] text-white' : 'bg-[#ECEAE8] text-[#A8A29E]'}`}>{n}</span>
      ) : null}
      {icon && <span className="text-[13px]">{icon}</span>}
      <span className="flex-1">{label}</span>
      <span className={`min-w-[22px] text-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tnum ${active ? 'bg-[#FBD9C4] text-[#C2410C]' : 'bg-[#ECEAE8] text-[#78716C]'}`}>{formatQty(count)}</span>
    </Link>
  )
}
