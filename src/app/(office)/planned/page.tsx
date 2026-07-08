import { getJobList } from '@/lib/dashboard'
import { JobRow } from '@/components/JobRow'
import { formatQty } from '@/lib/format'

export default async function PlannedPage() {
  const jobs = await getJobList({ planned: true, includeClosed: true })

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">ทะเบียนงานตามแผน</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">งานที่วางแผนไว้แต่ยังไม่เซ็นสัญญา · สำหรับฝ่ายธุรการติดตามการทำสัญญา (แก้ไขงาน → เปลี่ยนเป็น “เซ็นสัญญาแล้ว” เมื่อได้สัญญา งานจะย้ายไปทะเบียนหลัก)</p>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 text-[15px] font-bold">รายการงานตามแผน · {formatQty(jobs.length)} รายการ</div>
        {jobs.length > 0 ? (
          jobs.map((j) => <JobRow key={j.id} job={j} />)
        ) : (
          <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#F1F5F9]">ยังไม่มีงานตามแผน</div>
        )}
      </div>
    </div>
  )
}
