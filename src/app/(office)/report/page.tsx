import Link from 'next/link'
import type { Role } from '@prisma/client'
import { getDailySummary, type StaffSummary } from '@/lib/daily-summary'
import { dayRangeLocal } from '@/lib/activity'
import { CopyReportButton } from '@/components/CopyReportButton'

const dateTitle = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const ROLE_UNIT: Record<string, string> = {
  OFFICE: 'Office (Smart Kiosk)', FIELD: 'Field (Smart Kiosk)', TECHNICIAN: 'Technician (Smart Kiosk)',
  EXECUTIVE: 'Executive (Smart Kiosk)', ADMIN: 'Admin (Smart Kiosk)', SYSTEM_ADMIN: 'Admin (Smart Kiosk)',
}
const unitLabel = (role: Role) => ROLE_UNIT[role] ?? 'Office (Smart Kiosk)'

function parseDateParam(d?: string): Date {
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day) }
  return new Date()
}
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function beDate(d: Date) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}` }
const staffName = (s: StaffSummary) => `${s.name}${s.nickname ? ` (${s.nickname})` : ''}`

// Plain-text report matching the standard template (for copy → paste elsewhere).
function reportText(s: StaffSummary, day: Date): string {
  const L: string[] = []
  L.push(`รายงานปฏิบัติงาน : สรุปการทำงานวันนี้ ${unitLabel(s.role)}`)
  L.push(`ผู้ปฏิบัติงาน : ${staffName(s)}`)
  L.push(`วันที่ ${beDate(day)}`)
  if (s.issueDetails.length) {
    L.push('')
    L.push('งานแก้ไขปัญหา smart innovation')
    for (const it of s.issueDetails) {
      L.push(`${it.hospital}${it.product ? ` ${it.product}` : ''}`)
      L.push('แจ้งปัญหา')
      L.push(it.problem)
      L.push('การดำเนินการ')
      L.push(it.solution || '-')
      L.push('')
    }
  }
  for (const l of s.lines) {
    L.push('')
    L.push(l.heading)
    L.push(l.text)
    for (const it of l.items) L.push(`- ${it}`)
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
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
            {/* report header block */}
            <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-[#F1F3F6]">
              <div className="text-[13.5px] leading-relaxed">
                <div><span className="font-bold text-[#1C1917]">รายงานปฏิบัติงาน :</span> <span className="text-[#3C4A5E]">สรุปการทำงานวันนี้ {unitLabel(staff.role)}</span></div>
                <div><span className="font-bold text-[#1C1917]">ผู้ปฏิบัติงาน :</span> <span className="text-[#3C4A5E]">{staffName(staff)}</span></div>
                <div><span className="font-bold text-[#1C1917]">วันที่</span> <span className="text-[#3C4A5E] tnum">{beDate(day)}</span></div>
                {staff.ratingCount > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[12px]">
                    <span className="tracking-tight text-[#D97706] leading-none">{'★'.repeat(Math.round(staff.rating))}<span className="text-[#E7E1D5]">{'★'.repeat(5 - Math.round(staff.rating))}</span></span>
                    <span className="font-bold text-[#B45309]">{staff.rating.toFixed(1)}</span>
                    <span className="text-[#A8A29E]">ความพึงพอใจ · {staff.ratingCount} รีวิว</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12.5px] font-semibold text-[#8492A6]">{staff.total} รายการ</span>
                <CopyReportButton text={reportText(staff, day)} />
              </div>
            </div>

            {/* งานแก้ไขปัญหา (general issues, detailed) */}
            {staff.issueDetails.length > 0 && (
              <div className="mb-4">
                <div className="text-[14.5px] font-bold text-[#1C1917] mb-2.5">งานแก้ไขปัญหา smart innovation</div>
                <div className="flex flex-col gap-3">
                  {staff.issueDetails.map((it, i) => (
                    <div key={i} className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] p-3.5">
                      <div className="text-[13.5px] font-bold text-[#1C1917]">{it.hospital}{it.product ? ` · ${it.product}` : ''}</div>
                      <div className="mt-1.5"><span className="text-[12.5px] font-semibold text-[#B45309]">แจ้งปัญหา</span><div className="text-[13px] text-[#3C4A5E] mt-0.5 whitespace-pre-wrap">{it.problem}</div></div>
                      <div className="mt-1.5"><span className="text-[12.5px] font-semibold text-[#157F4C]">การดำเนินการ</span><div className="text-[13px] text-[#3C4A5E] mt-0.5 whitespace-pre-wrap">{it.solution || '—'}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* other work */}
            {staff.lines.length > 0 && (
              <ol className="flex flex-col gap-3">
                {staff.lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-[#FFEDE1] text-[#EA580C] grid place-items-center text-[12.5px] font-bold tnum">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-[#1C1917]">{l.heading}</div>
                      <div className="text-[13.5px] text-[#3C4A5E] mt-0.5 leading-relaxed">{l.text}</div>
                      {l.items.length > 0 && (
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {l.items.map((it, k) => (
                            <li key={k} className="flex items-start gap-1.5 text-[12.5px] text-[#5A6B82]">
                              <span className="text-[#C4BFB9] mt-0.5">•</span><span className="tnum">{it}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))
      )}
    </div>
  )
}
