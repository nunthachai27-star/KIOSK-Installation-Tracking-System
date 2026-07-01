import { getSummary, getJobList } from '@/lib/dashboard'
import { StatStrip } from '@/components/StatStrip'
import { JobRow } from '@/components/JobRow'
import { formatQty } from '@/lib/format'

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
  return (
    <div className="p-6 max-w-[1160px] mx-auto">
      <div className="mb-6"><StatStrip items={items} /></div>
      <div className="bg-white border border-[#DEDDEC] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1.5 text-[15px] font-bold">รายการงาน</div>
        {jobs.map(j => <JobRow key={j.id} job={j} />)}
      </div>
    </div>
  )
}
