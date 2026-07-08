import { prisma } from './prisma'
import type { ActivityType, ActivityStatus } from '@prisma/client'
import { PROGRESS_RANK } from './status'
import { addBusinessDays } from './workdays'

export const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
  { key: 'QC', label: 'ตรวจสอบสินค้า & QC' },
  { key: 'DELIVERY', label: 'จัดส่งสินค้า' },
  { key: 'REMOTE', label: 'Remote ติดตั้ง' },
  { key: 'ONSITE', label: 'ติดตั้งหน้างาน' },
  { key: 'TRAINING', label: 'อบรมการใช้งาน' },
  { key: 'HANDOVER', label: 'อบรม / ส่งมอบงาน' },
]

export const ACTIVITY_LABEL: Record<ActivityType, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((a) => [a.key, a.label]),
) as Record<ActivityType, string>

export const ACTIVITY_ACCENT: Record<ActivityType, string> = {
  QC: '#9A6B10',
  DELIVERY: '#1B5FD9',
  REMOTE: '#0B7C86',
  ONSITE: '#3B45C4',
  TRAINING: '#157F4C',
  HANDOVER: '#B0329A',
}

// Emoji symbol shown on the Monitor board so each work type is recognisable at a glance.
export const ACTIVITY_ICON: Record<ActivityType, string> = {
  QC: '🔍',
  DELIVERY: '🚚',
  REMOTE: '🖥️',
  ONSITE: '🔧',
  TRAINING: '🎓',
  HANDOVER: '🤝',
}

export const ACTIVITY_STATUS: Record<ActivityStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: '#8492A6', bg: '#EEF1F5' },
  SCHEDULED: { label: 'นัดหมายแล้ว', color: '#1B5FD9', bg: '#E4EEFF' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: '#9A6B10', bg: '#FAF0D8' },
  DONE: { label: 'เสร็จแล้ว', color: '#157F4C', bg: '#E2F3EA' },
  POSTPONED: { label: 'เลื่อนนัด', color: '#8492A6', bg: '#EEF1F5' },
  PROBLEM: { label: 'ติดปัญหา', color: '#C13540', bg: '#FBE4E4' },
}

export function isActivityType(v: string): v is ActivityType {
  return ACTIVITY_TYPES.some((a) => a.key === v)
}

export function dayRangeLocal(d: Date): { from: Date; to: Date } {
  const from = new Date(d); from.setHours(0, 0, 0, 0)
  const to = new Date(d); to.setHours(23, 59, 59, 999)
  return { from, to }
}

export async function getQueueForDate(from: Date, to: Date) {
  return prisma.jobActivity.findMany({
    where: { activityDate: { gte: from, lte: to } },
    include: { job: { include: { hospital: true } }, responsibleUser: true },
    orderBy: { activityDate: 'asc' },
  })
}

/** One row on the Monitor board — flattened from either a JobActivity or a record date. */
export type MonitorItem = {
  id: string
  activityType: ActivityType
  icon: string
  label: string
  activityDate: Date
  status: ActivityStatus
  allDay: boolean
  responsibleName: string | null
  productType: string
  quantity: number
  jobCode: string
  province: string
  hospitalName: string
}

function ymdKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function delivStatus(s: string): ActivityStatus {
  if (s === 'ARRIVED') return 'DONE'
  if (s === 'SHIPPING') return 'IN_PROGRESS'
  if (s === 'PROBLEM' || s === 'DELAYED') return 'PROBLEM'
  return 'SCHEDULED'
}
function instStatus(s: string): ActivityStatus {
  if (s === 'DONE') return 'DONE'
  if (s === 'INSTALLING') return 'IN_PROGRESS'
  if (s === 'FAILED' || s === 'PROBLEM') return 'PROBLEM'
  if (s === 'POSTPONED') return 'POSTPONED'
  return 'SCHEDULED'
}
function handStatus(s: string): ActivityStatus {
  if (s === 'DELIVERED') return 'DONE'
  if (s === 'RECEIVED') return 'IN_PROGRESS'
  return 'SCHEDULED'
}

/**
 * Monitor board queue for a day: manual JobActivity items PLUS dates pulled
 * straight from the delivery/installation records (ขนออก/ส่งถึง/Remote/ติดตั้ง).
 * A record date is skipped if a manual queue item already covers the same
 * job + type + day (the manual one wins, since it carries status + staff).
 */
export async function getMonitorQueueForDate(from: Date, to: Date): Promise<MonitorItem[]> {
  const jobInclude = { hospital: true, installerOwner: true, adminOwner: true } as const
  const inRange = (d: Date | null | undefined) => !!d && d >= from && d <= to
  // "Call the hospital" reminders fall 2 business days after shipping, so widen
  // the ship-date scan by a few calendar days to catch reminders landing today.
  const callFrom = new Date(from); callFrom.setDate(from.getDate() - 5)

  const [activities, deliveries, installs, qcPlans, handovers, shippedDeliveries] = await Promise.all([
    prisma.jobActivity.findMany({
      where: { activityDate: { gte: from, lte: to } },
      include: { job: { include: { hospital: true } }, responsibleUser: true },
    }),
    prisma.deliveryRecord.findMany({
      where: { OR: [{ shippedDate: { gte: from, lte: to } }, { arrivedDate: { gte: from, lte: to } }] },
      include: { job: { include: jobInclude } },
    }),
    prisma.installationRecord.findMany({
      where: { OR: [{ remoteDate: { gte: from, lte: to } }, { onsiteDate: { gte: from, lte: to } }] },
      include: { job: { include: jobInclude } },
    }),
    // Auto-planned QC dates (set when serial install is "ลงครบแล้ว").
    prisma.serialRecord.findMany({
      where: { status: 'DONE', qcPlannedDate: { gte: from, lte: to } },
      include: { job: { include: jobInclude } },
    }),
    // Handover (ส่งมอบงาน) dates.
    prisma.handoverRecord.findMany({
      where: { handoverDate: { gte: from, lte: to } },
      include: { job: { include: jobInclude } },
    }),
    // Shipped deliveries — used to raise the "call to book install" reminder.
    prisma.deliveryRecord.findMany({
      where: { shippedDate: { gte: callFrom, lte: to } },
      include: { job: { include: { ...jobInclude, installation: { select: { remoteDate: true, onsiteDate: true } } } } },
    }),
  ])

  const items: MonitorItem[] = []
  const covered = new Set<string>()

  for (const a of activities) {
    covered.add(`${a.jobId}|${a.activityType}|${ymdKey(a.activityDate)}`)
    items.push({
      id: a.id,
      activityType: a.activityType,
      icon: ACTIVITY_ICON[a.activityType],
      label: ACTIVITY_LABEL[a.activityType],
      activityDate: a.activityDate,
      status: a.status,
      allDay: false,
      responsibleName: a.responsibleUser?.name ?? null,
      productType: a.job.productType,
      quantity: a.job.quantity,
      jobCode: a.job.jobCode,
      province: a.job.province,
      hospitalName: a.job.hospital.name,
    })
  }

  const pushRecord = (
    id: string, type: ActivityType, label: string, date: Date, status: ActivityStatus,
    job: { id: string; productType: string; quantity: number; jobCode: string; province: string; hospital: { name: string }; installerOwner: { name: string } | null; adminOwner: { name: string } | null },
    icon: string = ACTIVITY_ICON[type],
  ) => {
    if (covered.has(`${job.id}|${type}|${ymdKey(date)}`)) return
    items.push({
      id, activityType: type, icon, label, activityDate: date, status, allDay: true,
      responsibleName: job.installerOwner?.name ?? job.adminOwner?.name ?? null,
      productType: job.productType, quantity: job.quantity, jobCode: job.jobCode,
      province: job.province, hospitalName: job.hospital.name,
    })
  }

  for (const d of deliveries) {
    if (inRange(d.shippedDate)) pushRecord(`ship-${d.id}`, 'DELIVERY', 'จัดส่งสินค้า (ขนออก)', d.shippedDate!, delivStatus(d.status), d.job)
    if (inRange(d.arrivedDate)) pushRecord(`arr-${d.id}`, 'DELIVERY', 'จัดส่งสินค้า (ถึงปลายทาง)', d.arrivedDate!, delivStatus(d.status), d.job, '📦')
  }
  for (const it of installs) {
    if (inRange(it.remoteDate)) pushRecord(`rem-${it.id}`, 'REMOTE', 'Remote ติดตั้ง', it.remoteDate!, instStatus(it.status), it.job)
    if (inRange(it.onsiteDate)) pushRecord(`ons-${it.id}`, 'ONSITE', 'ติดตั้งหน้างาน', it.onsiteDate!, instStatus(it.status), it.job)
  }
  for (const h of handovers) {
    if (inRange(h.handoverDate)) pushRecord(`hand-${h.id}`, 'HANDOVER', 'ส่งมอบงาน', h.handoverDate!, handStatus(h.handoverStatus), h.job)
  }
  // Reminder: call the hospital to book the install date, 2 business days after shipping.
  for (const d of shippedDeliveries) {
    if (!d.shippedDate) continue
    const callDue = addBusinessDays(d.shippedDate, 2)
    if (!inRange(callDue)) continue
    // Drop once the Remote/onsite date is booked, or the job is handed over/closed.
    if (d.job.installation?.remoteDate || d.job.installation?.onsiteDate) continue
    if (PROGRESS_RANK[d.job.currentStatus] >= PROGRESS_RANK.HANDED_OVER) continue
    pushRecord(`call-${d.id}`, 'DELIVERY', 'โทรนัดติดตั้ง', callDue, 'PENDING', d.job, '📞')
  }

  // Jobs where the office already scheduled a real QC activity — the auto-plan
  // is superseded, so don't double it up.
  const qcScheduledJobs = new Set(activities.filter((a) => a.activityType === 'QC').map((a) => a.jobId))
  for (const sr of qcPlans) {
    if (!inRange(sr.qcPlannedDate)) continue
    if (qcScheduledJobs.has(sr.jobId)) continue
    // Hide once QC is passed (status advanced to พร้อมจัดส่ง or beyond).
    if (PROGRESS_RANK[sr.job.currentStatus] >= PROGRESS_RANK.READY_TO_SHIP) continue
    pushRecord(`qcplan-${sr.jobId}`, 'QC', 'วางแผนตรวจ QC', sr.qcPlannedDate!, 'SCHEDULED', sr.job, '🗓️')
  }

  // hide finished work — the board shows only what still needs doing
  const pending = items.filter((it) => it.status !== 'DONE')

  // timed items first (by time), all-day record items after
  pending.sort((a, b) =>
    (a.allDay ? 1 : 0) - (b.allDay ? 1 : 0) ||
    a.activityDate.getTime() - b.activityDate.getTime(),
  )
  return pending
}
