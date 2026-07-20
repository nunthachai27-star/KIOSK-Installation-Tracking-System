import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { QueueManager } from '@/components/QueueManager'
import { TaskManager } from '@/components/TaskManager'
import { ACTIVITY_TYPES, ACTIVITY_LABEL, TASK_KINDS, getQueueForDate, dayRangeLocal } from '@/lib/activity'

const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })

/** วันตั้งต้นของคิว: กำหนดส่ง → วันเริ่มสัญญา → วันสิ้นสุดสัญญา (คืน YYYY-MM-DD หรือ '') */
function defaultDateOf(j: { deliveryDueDate: Date | null; contractStartDate: Date | null; contractEndDate: Date | null }): string {
  const d = j.deliveryDueDate ?? j.contractStartDate ?? j.contractEndDate
  return d ? d.toISOString().slice(0, 10) : ''
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  // Which day's queue to show: ?d=YYYY-MM-DD, else today.
  const dateStr = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayStr
  const viewDate = new Date(`${dateStr}T00:00:00`)
  const { from, to } = dayRangeLocal(viewDate)

  const [jobs, users, queue, tasks] = await Promise.all([
    prisma.job.findMany({ include: { hospital: true }, orderBy: { jobCode: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    getQueueForDate(from, to),
    prisma.task.findMany({ include: { responsibleUser: { select: { name: true } } }, orderBy: { startDate: 'desc' }, take: 100 }),
  ])

  const jobOpts = jobs.map((j) => ({
    id: j.id,
    label: `${j.jobCode} · ${j.hospital.name} · ${j.productType}`,
    date: defaultDateOf(j),
  }))
  const initial = queue.map((q) => ({
    id: q.id,
    time: timeFmt.format(q.activityDate),
    typeLabel: ACTIVITY_LABEL[q.activityType],
    product: q.job.productType,
    hospital: q.job.hospital.name,
    staff: q.responsibleUser?.name ?? '—',
  }))
  const taskItems = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    kind: t.kind,
    hospitalName: t.hospitalName,
    owner: t.responsibleUser?.name ?? null,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate ? t.endDate.toISOString() : null,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">จัดคิวงาน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">จัดลำดับงานในคิว ตรวจสอบสถานะ และเพิ่มการแจ้งเตือนงานต่างๆ</p>
        </div>
        <Link href="/monitor" target="_blank"
          className="ds-hover flex items-center gap-1.5 border border-[#FAD3B8] text-[#EA580C] text-[13px] font-semibold rounded-lg px-3.5 py-2 hover:bg-[#FFF7F2]">
          เปิดหน้า Monitor ↗
        </Link>
      </div>
      <QueueManager jobs={jobOpts} users={users} types={[...ACTIVITY_TYPES]} initial={initial} date={dateStr} today={todayStr}>
        <TaskManager users={users} kinds={TASK_KINDS} initial={taskItems} today={todayStr} />
      </QueueManager>
    </div>
  )
}
