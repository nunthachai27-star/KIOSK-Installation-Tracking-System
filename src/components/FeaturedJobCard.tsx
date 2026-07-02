import Link from 'next/link'
import type { Job, Hospital } from '@prisma/client'
import { StatusBadge } from './StatusBadge'
import { StepTracker } from './StepTracker'
import { stepForStatus } from '@/lib/status'
import { STEP_LABELS } from '@/lib/steps'
import { formatQty } from '@/lib/format'

const STEP_SUFFIX = ['', '/qc', '/delivery', '/handover'] as const

// Prominent card for the current in-progress job: header + 4-step tracker +
// "do the next step" call to action. Mirrors the mockup dashboard hero card.
export function FeaturedJobCard({ job }: { job: Job & { hospital: Hospital } }) {
  const step = stepForStatus(job.currentStatus)
  const nextLabel = STEP_LABELS[step - 1]
  const nextHref = `/jobs/${job.id}${STEP_SUFFIX[step - 1]}`
  return (
    <div className="ds-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[17px] font-bold text-[#12233B]">{job.hospital.name}</span>
          <span className="text-[12.5px] text-[#8492A6]">
            {job.jobCode} · {job.province} · {job.productType} ×{formatQty(job.quantity)}
          </span>
        </div>
        <StatusBadge status={job.currentStatus} />
      </div>

      <StepTracker active={step} />

      <div className="flex flex-wrap gap-2.5 mt-6 pt-4 border-t border-[#F1F5F9]">
        <Link
          href={nextHref}
          className="ds-hover bg-[#2F6BED] text-white rounded-xl px-5 py-2.5 text-[13.5px] font-semibold hover:bg-[#1E51D0] shadow-[0_8px_20px_-10px_rgba(47,107,237,0.6)]"
        >
          ทำสเต็ปถัดไป: {nextLabel}
        </Link>
        <Link
          href={`/jobs/${job.id}`}
          className="ds-hover border border-[#D6DFEA] text-[#5A6B82] rounded-xl px-5 py-2.5 text-[13.5px] font-medium hover:bg-[#F8FAFD]"
        >
          ดูรายละเอียด
        </Link>
      </div>
    </div>
  )
}
