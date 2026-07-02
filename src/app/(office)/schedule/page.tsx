import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { QueueManager } from '@/components/QueueManager'
import { ACTIVITY_TYPES, ACTIVITY_LABEL, getQueueForDate, dayRangeLocal } from '@/lib/activity'

const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })

export default async function SchedulePage() {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const { from, to } = dayRangeLocal(today)

  const [jobs, users, queue] = await Promise.all([
    prisma.job.findMany({ include: { hospital: true }, orderBy: { jobCode: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    getQueueForDate(from, to),
  ])

  const jobOpts = jobs.map((j) => ({ id: j.id, label: `${j.jobCode} · ${j.hospital.name} · ${j.productType}` }))
  const initial = queue.map((q) => ({
    id: q.id,
    time: timeFmt.format(q.activityDate),
    typeLabel: ACTIVITY_LABEL[q.activityType],
    product: q.job.productType,
    hospital: q.job.hospital.name,
    staff: q.responsibleUser?.name ?? '—',
  }))

  return (
    <div className="p-6 max-w-[900px] mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#12233B]">จัดคิวงาน</h1>
        <Link href="/monitor" target="_blank" className="ds-hover text-sm font-semibold text-[#2F6BED] hover:underline">
          เปิดหน้า Monitor ↗
        </Link>
      </div>
      <QueueManager jobs={jobOpts} users={users} types={[...ACTIVITY_TYPES]} initial={initial} date={dateStr} />
    </div>
  )
}
