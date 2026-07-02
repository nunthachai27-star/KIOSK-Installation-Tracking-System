import { prisma } from './prisma'
import type { ActivityType, ActivityStatus } from '@prisma/client'

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
