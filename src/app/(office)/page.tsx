import { getSummary, getJobList } from '@/lib/dashboard'
import { StatStrip } from '@/components/StatStrip'
import { FeaturedJobCard } from '@/components/FeaturedJobCard'
import { JobRow } from '@/components/JobRow'
import { formatQty } from '@/lib/format'

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED']

export default async function Home() {
  const now = new Date()
  const s = await getSummary(now)
  const jobs = await getJobList()
  const items = [
    { label: 'งานทั้งหมด', value: formatQty(s.total) },
    { label: 'พร้อมจัดส่ง', value: formatQty(s.toShip) },
    { label: 'รอส่งมอบ', value: formatQty(s.toHandover) },
    { label: 'เลยกำหนด', value: formatQty(s.overdue), warn: s.overdue > 0 },
  ]

  // Feature the most recently updated job that is still in progress.
  const featured = jobs.find((j) => !CLOSED_STATUSES.includes(j.currentStatus)) ?? jobs[0]
  const others = jobs.filter((j) => j.id !== featured?.id)

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <StatStrip items={items} />

      {featured && <FeaturedJobCard job={featured} />}

      <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1.5 text-[15px] font-bold">งานอื่น ๆ</div>
        {others.length > 0 ? (
          others.map((j) => <JobRow key={j.id} job={j} />)
        ) : (
          <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#F1F5F9]">ไม่มีงานอื่น</div>
        )}
      </div>
    </div>
  )
}
