import Link from 'next/link'
import type { Job, Hospital } from '@prisma/client'
import { StatusBadge } from './StatusBadge'
import { formatQty } from '@/lib/format'

export function JobRow({ job }: { job: Job & { hospital: Hospital } }) {
  return (
    <Link href={`/jobs/${job.id}`} className="grid grid-cols-[1.6fr_1.3fr_130px_90px] items-center px-5 py-3.5 border-t border-[#F1F5F9] hover:bg-[#FBFCFE]">
      <div>
        <div className="text-sm font-semibold">{job.hospital.name}</div>
        <div className="text-xs text-[#8492A6]">{job.jobCode} · {job.province}</div>
      </div>
      <div className="text-[13px] text-[#3C4A5E]">{job.productType} ×{formatQty(job.quantity)}</div>
      <div><StatusBadge status={job.currentStatus} /></div>
      <div className="text-right text-[12.5px] font-semibold text-[#2F6BED]">อัปเดต ›</div>
    </Link>
  )
}
