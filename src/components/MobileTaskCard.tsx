import Link from 'next/link'
import type { JobActivity, Job, Hospital, ActivityType } from '@prisma/client'
import { formatQty } from '@/lib/format'

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  DELIVERY: 'จัดส่ง',
  REMOTE: 'ติดตั้งทางไกล',
  ONSITE: 'ติดตั้งหน้างาน',
  TRAINING: 'อบรมการใช้งาน',
  QC: 'ตรวจสอบ/QC',
  HANDOVER: 'อบรม/ส่งมอบ',
}

const ACTIVITY_COLOR: Record<ActivityType, { color: string; bg: string }> = {
  DELIVERY: { color: '#1B5FD9', bg: '#E4EEFF' },
  REMOTE: { color: '#9A6B10', bg: '#FAF0D8' },
  ONSITE: { color: '#9A6B10', bg: '#FAF0D8' },
  TRAINING: { color: '#157F4C', bg: '#E2F3EA' },
  QC: { color: '#9A6B10', bg: '#FAF0D8' },
  HANDOVER: { color: '#B0329A', bg: '#F7E3F3' },
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function mapsUrl(hospital: Hospital): string {
  const query = hospital.latitude != null && hospital.longitude != null
    ? `${hospital.latitude},${hospital.longitude}`
    : hospital.name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function MobileTaskCard({
  activity,
}: {
  activity: JobActivity & { job: Job & { hospital: Hospital } }
}) {
  const { job } = activity
  const { hospital } = job
  const badge = ACTIVITY_COLOR[activity.activityType]

  return (
    <div className="bg-white rounded-2xl border border-[#E7EDF4] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-[#1C1917]">{formatTime(activity.activityDate)}</span>
        <span
          className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {ACTIVITY_LABEL[activity.activityType]}
        </span>
      </div>

      <div className="text-[15px] font-bold text-[#1C1917]">{hospital.name}</div>
      <div className="text-[13px] text-[#5A6B82] mt-0.5">
        {hospital.province} · {job.productType}
        {job.productModel ? ` · ${job.productModel}` : ''} ×{formatQty(job.quantity)}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          href={job.contactPhone ? `tel:${job.contactPhone}` : undefined}
          aria-disabled={!job.contactPhone}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[12px] font-semibold ${
            job.contactPhone
              ? 'bg-[#FFEDE1] text-[#EA580C]'
              : 'bg-[#F1F5F9] text-[#B7C1CE] pointer-events-none'
          }`}
        >
          <span className="text-base">📞</span>
          โทร
        </a>
        <a
          href={mapsUrl(hospital)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[12px] font-semibold bg-[#FFEDE1] text-[#EA580C]"
        >
          <span className="text-base">🧭</span>
          นำทาง
        </a>
        <Link
          href={`/m/jobs/${job.id}/report`}
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[12px] font-semibold bg-[#EA580C] text-white"
        >
          <span className="text-base">📝</span>
          บันทึกงาน
        </Link>
      </div>
    </div>
  )
}
