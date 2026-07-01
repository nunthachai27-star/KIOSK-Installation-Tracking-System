import Link from 'next/link'
import type { Job, Hospital } from '@prisma/client'
import { StatusBadge } from './StatusBadge'
import { stepForStatus } from '@/lib/status'
import { formatQty } from '@/lib/format'

export function JobRow({ job }: { job: Job & { hospital: Hospital } }) {
  const step = stepForStatus(job.currentStatus)
  const isBad = job.currentStatus === 'PROBLEM' || job.currentStatus === 'CANCELLED'
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="grid grid-cols-[1.5fr_1fr_88px_120px_78px] items-center px-5 py-3.5 border-t border-[#F1F5F9] hover:bg-[#FBFCFE]"
    >
      <div>
        <div className="text-sm font-semibold">{job.hospital.name}</div>
        <div className="text-xs text-[#8492A6]">{job.jobCode} · {job.province}</div>
      </div>
      <div className="text-[13px] text-[#3C4A5E]">{job.productType} ×{formatQty(job.quantity)}</div>
      <div className="flex gap-1.5 items-center">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: i <= step ? (isBad ? '#C13540' : '#2F6BED') : '#E1E9F3' }}
          />
        ))}
      </div>
      <div><StatusBadge status={job.currentStatus} /></div>
      <div className="text-right text-[12.5px] font-semibold text-[#2F6BED]">อัปเดต ›</div>
    </Link>
  )
}
