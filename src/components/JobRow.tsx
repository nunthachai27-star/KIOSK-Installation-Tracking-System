import Link from 'next/link'
import type { Job, Hospital } from '@prisma/client'
import { StatusBadge } from './StatusBadge'
import { stepForStatus } from '@/lib/status'
import { formatQty, formatThaiDate } from '@/lib/format'

// Open a job at the step page matching its current workflow stage (index = step-1).
const STEP_HREF = ['', '/serial', '/qc', '/delivery', '/handover', '/invoice']

export type JobRowData = Job & {
  hospital: Hospital
  delivery: { shippedDate: Date | null } | null
  installation: { remoteDate: Date | null; result: string | null } | null
  handover: { checklistReceivedDate: Date | null; handoverDate: Date | null } | null
  invoice: { warrantyEndDate: Date | null } | null
  memoStatus?: 'DONE' | 'PENDING' // สถานะ ขอเปิด MEMO License (จากการติ๊กในหน้า QC)
}

// MEMO-License warning under the job code — only shows when still pending;
// once done (or the job is closed) it disappears, no green badge.
function MemoBadge({ status }: { status?: 'DONE' | 'PENDING' }) {
  if (status !== 'PENDING') return null
  return <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FBE4E4] text-[#C13540]">⚠ ยังไม่ขอเปิด MEMO</span>
}

// The InstallationRecord stores the field tech as "จนท. Remote: <name>".
function inspectorName(result: string | null | undefined): string | null {
  if (!result) return null
  const name = result.replace(/^จนท\.?\s*Remote\s*[:：]?\s*/i, '').trim()
  return name || null
}

type Warn = { label: string; color: string; bg: string; bar: string }

// Contract-expiry alert: red within 15 days (or already past), amber within 30.
function contractWarn(job: JobRowData): Warn | null {
  if (job.currentStatus === 'CLOSED' || job.currentStatus === 'CANCELLED') return null
  if (!job.contractEndDate) return null
  const days = Math.ceil((new Date(job.contractEndDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: 'หมดสัญญาแล้ว', color: '#C13540', bg: '#FBE4E4', bar: '#C13540' }
  if (days <= 15) return { label: `ใกล้หมดสัญญา · เหลือ ${days} วัน`, color: '#C13540', bg: '#FBE4E4', bar: '#C13540' }
  if (days <= 30) return { label: `ใกล้หมดสัญญา · เหลือ ${days} วัน`, color: '#B45309', bg: '#FBEBCB', bar: '#D97706' }
  return null
}

export function JobRow({ job }: { job: JobRowData }) {
  const step = stepForStatus(job.currentStatus)
  const isBad = job.currentStatus === 'PROBLEM' || job.currentStatus === 'CANCELLED'
  const warn = contractWarn(job)

  const inspector = inspectorName(job.installation?.result)
  const milestones = [
    { label: 'ตรวจสอบ', date: job.handover?.checklistReceivedDate, color: '#9A6B10' },
    { label: 'จัดส่ง', date: job.delivery?.shippedDate, color: '#1B5FD9' },
    { label: 'Remote', date: job.installation?.remoteDate, color: '#0B7C86' },
    { label: 'ส่งมอบ', date: job.handover?.handoverDate, color: '#157F4C' },
    { label: '🛡 ประกันถึง', date: job.invoice?.warrantyEndDate, color: '#6D28D9' },
  ].filter((m) => m.date)

  const warnChip = warn && (
    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: warn.bg, color: warn.color }}>
      ⚠ {warn.label}
    </span>
  )

  const dots = (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: i <= step ? (isBad ? '#C13540' : '#EA580C') : '#E1E9F3' }}
        />
      ))}
    </div>
  )

  return (
    <Link
      href={`/jobs/${job.id}${STEP_HREF[step - 1]}`}
      prefetch={false}
      className="group ds-hover block px-5 py-3.5 border-t border-[#EEF2F8] border-l-4 hover:bg-[#F8FAFD]"
      style={{ borderLeftColor: warn ? warn.bar : 'transparent' }}
    >
      {/* mobile: stacked card */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{job.hospital.name}</div>
            <div className="text-xs text-[#8492A6] truncate">{job.jobCode} · {job.province}</div>
            <MemoBadge status={job.memoStatus} />
          </div>
          <StatusBadge status={job.currentStatus} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] text-[#3C4A5E] truncate">{job.productType} ×{formatQty(job.quantity)}</div>
          {dots}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11.5px] text-[#5A6B82]">
            เริ่ม {formatThaiDate(job.contractStartDate)} · สิ้นสุด {formatThaiDate(job.contractEndDate)}
          </div>
          <span className="text-[11px] text-[#A8A29E] whitespace-nowrap">ล่าสุด {formatThaiDate(job.updatedAt)}</span>
        </div>
        {warnChip && <div>{warnChip}</div>}
      </div>

      {/* desktop: table row — grid template shared with the header in page.tsx (JOB_GRID) */}
      <div className="hidden md:grid grid-cols-[1.7fr_1.2fr_150px_180px_96px_28px] items-center gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-[#EEF3FA] text-[#5A6B82] grid place-items-center">🏢</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{job.hospital.name}</div>
            <div className="text-xs text-[#8492A6] truncate">{job.jobCode} · {job.province}</div>
            <MemoBadge status={job.memoStatus} />
          </div>
        </div>
        <div className="text-[13px] text-[#3C4A5E] truncate">{job.productType} ×{formatQty(job.quantity)}</div>
        <div className="text-[11.5px] text-[#5A6B82] leading-tight">
          <div>📅 {formatThaiDate(job.contractStartDate)}</div>
          <div className="text-[#A8A29E]">เสร็จ {formatThaiDate(job.contractEndDate)}</div>
          {warnChip && <div className="mt-1">{warnChip}</div>}
        </div>
        <div className="flex items-center gap-2.5">{dots}<StatusBadge status={job.currentStatus} /></div>
        <div className="text-[10.5px] text-[#A8A29E] leading-tight">{formatThaiDate(job.updatedAt)}</div>
        <div className="text-[#C4BFB9] text-lg leading-none text-center group-hover:text-[#EA580C]">⋮</div>
      </div>

      {/* milestone strip (both layouts) */}
      {(milestones.length > 0 || inspector) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {milestones.map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1.5 text-[11.5px] bg-[#F4F7FB] rounded-md px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
              <span className="text-[#5A6B82]">{m.label}</span>
              <span className="font-semibold text-[#3C4A5E] tnum">{formatThaiDate(m.date)}</span>
            </span>
          ))}
          {inspector && (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] bg-[#F4F7FB] rounded-md px-2 py-1">
              <span className="text-[#5A6B82]">ผู้ตรวจ</span>
              <span className="font-semibold text-[#3C4A5E]">{inspector}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
