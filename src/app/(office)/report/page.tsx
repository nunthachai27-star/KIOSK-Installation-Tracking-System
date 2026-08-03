import Link from 'next/link'
import type { Role } from '@prisma/client'
import { getDailySummary, type StaffSummary, type IssueDetail } from '@/lib/daily-summary'
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
  const block = (it: IssueDetail) => {
    L.push(`${it.hospital}${it.product ? ` ${it.product}` : ''}${it.serialNo ? ` · S/N ${it.serialNo}` : ''}`)
    L.push('แจ้งปัญหา')
    L.push(it.problem)
    const meta: string[] = []
    if (it.status) meta.push(`สถานะ: ${it.status}`)
    if (it.warranty) meta.push(it.warranty)
    if (it.method) meta.push(`วิธีดำเนินการ: ${it.method}`)
    if (meta.length) L.push(meta.join(' · '))
    if (it.failedSerial || it.replacementSerial) L.push(`อุปกรณ์เสีย ${it.failedSerial ?? '—'} → ส่งเปลี่ยน ${it.replacementSerial ?? '—'}`)
    if (it.parts.length) L.push(`อะไหล่ที่ใช้: ${it.parts.join(', ')}`)
    if (it.cost != null) L.push(`ค่าใช้จ่าย: ${it.cost.toLocaleString('th-TH')} บาท`)
    L.push('การดำเนินการ')
    if (it.steps.length) for (const st of it.steps) L.push(`- ${beDate(new Date(st.date))} : ${st.text}`)
    else L.push(it.solution || '-')
    L.push('')
  }
  const general = s.issueDetails.filter((x) => x.issueType === 'GENERAL')
  const claims = s.issueDetails.filter((x) => x.issueType === 'CLAIM')
  if (general.length) { L.push(''); L.push('งานแก้ไขปัญหา smart innovation'); general.forEach(block) }
  if (claims.length) { L.push(''); L.push('งานเคลมอุปกรณ์'); claims.forEach(block) }
  for (const l of s.lines) {
    L.push('')
    L.push(l.heading)
    L.push(l.text)
    for (const it of l.items) L.push(`- ${it}`)
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function SectionTitle({ icon, text, n }: { icon: string; text: string; n: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-[14.5px] font-bold text-[#1C1917]">{icon} {text}</span>
      <span className="text-[11px] font-bold tnum px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">{n}</span>
    </div>
  )
}

// One problem/claim rendered in full detail (status, warranty, method, serials,
// parts, cost, and today's resolution-timeline steps).
function IssueCard({ it }: { it: IssueDetail }) {
  return (
    <div className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] p-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13.5px] font-bold text-[#1C1917]">{it.hospital}{it.product ? ` · ${it.product}` : ''}</div>
        {it.status && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EEF3FA] text-[#1B5FD9] whitespace-nowrap">{it.status}</span>}
      </div>
      {(it.serialNo || it.warranty || it.method) && (
        <div className="text-[11.5px] text-[#8492A6] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {it.serialNo && <span className="tnum">S/N {it.serialNo}</span>}
          {it.warranty && <span>🛡️ {it.warranty}</span>}
          {it.method && <span>วิธี: {it.method}</span>}
        </div>
      )}
      <div className="mt-1.5"><span className="text-[12.5px] font-semibold text-[#B45309]">แจ้งปัญหา</span><div className="text-[13px] text-[#3C4A5E] mt-0.5 whitespace-pre-wrap">{it.problem}</div></div>
      {(it.failedSerial || it.replacementSerial) && <div className="text-[12px] text-[#5A6B82] mt-1.5">อุปกรณ์: <span className="tnum">{it.failedSerial ?? '—'}</span> → ส่งเปลี่ยน <span className="tnum">{it.replacementSerial ?? '—'}</span></div>}
      {it.parts.length > 0 && <div className="text-[12px] text-[#5A6B82] mt-1">อะไหล่ที่ใช้: {it.parts.join(', ')}</div>}
      {it.cost != null && <div className="text-[12px] text-[#5A6B82] mt-1">ค่าใช้จ่าย: <span className="tnum">{it.cost.toLocaleString('th-TH')}</span> บาท</div>}
      <div className="mt-1.5">
        <span className="text-[12.5px] font-semibold text-[#157F4C]">การดำเนินการ{it.steps.length ? ' (วันนี้)' : ''}</span>
        {it.steps.length ? (
          <ul className="mt-1 flex flex-col gap-1">
            {it.steps.map((s, k) => (
              <li key={k} className="text-[13px] text-[#3C4A5E] flex gap-2">
                <span className="text-[11px] font-bold text-[var(--brand)] tnum shrink-0 mt-[3px] whitespace-nowrap">{beDate(new Date(s.date))}</span>
                <span className="whitespace-pre-wrap">{s.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[13px] text-[#3C4A5E] mt-0.5 whitespace-pre-wrap">{it.solution || '—'}</div>
        )}
      </div>
    </div>
  )
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
        summary.map((staff) => {
          const general = staff.issueDetails.filter((x) => x.issueType === 'GENERAL')
          const claims = staff.issueDetails.filter((x) => x.issueType === 'CLAIM')
          return (
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

            {/* กลุ่ม: งานแก้ไขปัญหา */}
            {general.length > 0 && (
              <div className="mb-4">
                <SectionTitle icon="🛠️" text="งานแก้ไขปัญหา smart innovation" n={general.length} />
                <div className="flex flex-col gap-3">
                  {general.map((it, i) => <IssueCard key={i} it={it} />)}
                </div>
              </div>
            )}

            {/* กลุ่ม: งานเคลมอุปกรณ์ */}
            {claims.length > 0 && (
              <div className="mb-4">
                <SectionTitle icon="🧰" text="งานเคลมอุปกรณ์" n={claims.length} />
                <div className="flex flex-col gap-3">
                  {claims.map((it, i) => <IssueCard key={i} it={it} />)}
                </div>
              </div>
            )}

            {/* กลุ่ม: งานอื่นๆ ตามหมวด */}
            {staff.lines.length > 0 && (
              <>
              <SectionTitle icon="📋" text="งานอื่นๆ ตามหมวด" n={staff.lines.length} />
              <ol className="flex flex-col gap-3">
                {staff.lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] grid place-items-center text-[12.5px] font-bold tnum">{i + 1}</span>
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
              </>
            )}
          </div>
          )
        })
      )}
    </div>
  )
}
