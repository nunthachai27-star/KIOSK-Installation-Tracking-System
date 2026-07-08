import type { JobStatus } from '@prisma/client'

// step = position in the 6-stage workflow (ข้อมูลงาน / ลง Serial / QC / งานจัดส่ง / ติดตั้ง&ส่งมอบ / งานบิล).
export const STATUS_META: Record<JobStatus, { label: string; step: 1 | 2 | 3 | 4 | 5 | 6; color: string; bg: string }> = {
  DATA_ENTRY:    { label: 'ข้อมูลตั้งต้น',   step: 1, color: '#5A6B82', bg: '#EDF0F4' },
  PREPARING:     { label: 'เตรียมสินค้า',    step: 2, color: '#9A6B10', bg: '#FAF0D8' },
  QC:            { label: 'ตรวจสอบ QC',      step: 3, color: '#1B5FD9', bg: '#E4EEFF' },
  READY_TO_SHIP: { label: 'พร้อมจัดส่ง',     step: 4, color: '#157F4C', bg: '#E2F3EA' },
  INSTALLING:    { label: 'กำลังติดตั้ง',     step: 5, color: '#9A6B10', bg: '#FAF0D8' },
  HANDED_OVER:   { label: 'ส่งมอบแล้ว',      step: 5, color: '#157F4C', bg: '#E2F3EA' },
  WAIT_INVOICE:  { label: 'รอเปิดใบแจ้งหนี้', step: 6, color: '#1B5FD9', bg: '#E4EEFF' },
  CLOSED:        { label: 'ปิดงานแล้ว',      step: 6, color: '#157F4C', bg: '#E2F3EA' },
  PROBLEM:       { label: 'มีปัญหา',         step: 1, color: '#C13540', bg: '#FBE4E4' },
  CANCELLED:     { label: 'ยกเลิก',          step: 1, color: '#8492A6', bg: '#EEF1F5' },
}

export function stepForStatus(status: JobStatus): 1 | 2 | 3 | 4 | 5 | 6 {
  return STATUS_META[status].step
}

// Pipeline ordering for the registry: just-received (DATA_ENTRY) first, finished
// last. PROBLEM floats near the top so it gets attention; CANCELLED sinks last.
export const PROGRESS_RANK: Record<JobStatus, number> = {
  DATA_ENTRY: 0,
  PROBLEM: 1,
  PREPARING: 2,
  QC: 3,
  READY_TO_SHIP: 4,
  INSTALLING: 5,
  HANDED_OVER: 6,
  WAIT_INVOICE: 7,
  CLOSED: 8,
  CANCELLED: 9,
}

export function statusLabel(status: JobStatus): string {
  return STATUS_META[status].label
}

const OPEN_EXCLUDED: JobStatus[] = ['CLOSED', 'CANCELLED']

export function isOverdue(
  job: { deliveryDueDate: Date | null; currentStatus: JobStatus },
  now: Date,
): boolean {
  if (!job.deliveryDueDate) return false
  if (OPEN_EXCLUDED.includes(job.currentStatus)) return false
  return job.deliveryDueDate.getTime() < now.getTime()
}
