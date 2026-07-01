import Link from 'next/link'
import { getSummary, getJobList, countClosed } from '@/lib/dashboard'
import { StatStrip } from '@/components/StatStrip'
import { FeaturedJobCard } from '@/components/FeaturedJobCard'
import { JobRow } from '@/components/JobRow'
import { formatQty } from '@/lib/format'

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED']

export default async function Home({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams
  const showAll = all === '1'

  const now = new Date()
  const [s, jobs, closed] = await Promise.all([getSummary(now), getJobList(showAll), countClosed()])
  const items = [
    { label: 'งานทั้งหมด', value: formatQty(s.total) },
    { label: 'พร้อมจัดส่ง', value: formatQty(s.toShip) },
    { label: 'รอส่งมอบ', value: formatQty(s.toHandover) },
    { label: 'เลยกำหนด', value: formatQty(s.overdue), warn: s.overdue > 0 },
  ]

  // Feature the most recently updated job that is still in progress.
  const featured = jobs.find((j) => !CLOSED_STATUSES.includes(j.currentStatus)) ?? jobs[0]
  const others = jobs.filter((j) => j.id !== featured?.id)

  const tab = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${active ? 'bg-[#EAF1FF] text-[#2F6BED]' : 'text-[#5A6B82] hover:bg-[#F6F9FC]'}`

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <StatStrip items={items} />

      {featured && <FeaturedJobCard job={featured} />}

      <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-3 flex-wrap">
          <div className="text-[15px] font-bold">
            งานอื่น ๆ
            {!showAll && closed > 0 && (
              <span className="ml-2 text-[12.5px] font-normal text-[#8492A6]">ซ่อนงานที่ปิดแล้ว {formatQty(closed)} รายการ</span>
            )}
          </div>
          <div className="flex gap-1">
            <Link href="/" className={tab(!showAll)}>ยังไม่ปิดงาน</Link>
            <Link href="/?all=1" className={tab(showAll)}>แสดงทั้งหมด</Link>
          </div>
        </div>
        {others.length > 0 ? (
          others.map((j) => <JobRow key={j.id} job={j} />)
        ) : (
          <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#F1F5F9]">ไม่มีงานอื่น</div>
        )}
      </div>
    </div>
  )
}
