import type { IssueStatus, IssueEventType, IssueMethod, IssueWarranty } from '@prisma/client'

// Client-safe (no prisma import).
export const ISSUE_STATUS: Record<IssueStatus, { label: string; color: string; bg: string }> = {
  RECEIVED: { label: 'รับแจ้ง/ตรวจสอบ', color: '#B45309', bg: '#FBEBCB' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: '#1B5FD9', bg: '#E4EEFF' },
  WAIT_CUSTOMER_RETURN: { label: 'รอลูกค้าส่งอุปกรณ์กลับ', color: '#6D28D9', bg: '#F3EEFF' },
  SENT_TO_SUPPLIER: { label: 'ส่งซัพแก้ไข/เคลม', color: '#0B7C86', bg: '#E2F5F6' },
  SHIPPING_TO_CUSTOMER: { label: 'จัดส่งอุปกรณ์ให้ลูกค้า', color: '#1B5FD9', bg: '#E4EEFF' },
  WAIT_ONSITE: { label: 'รอเข้าติดตั้ง/แก้ไข', color: '#3B45C4', bg: '#E9EAFB' },
  QUOTATION: { label: 'ออกใบเสนอราคา', color: '#C2410C', bg: '#FFEDE1' },
  DONE: { label: 'ดำเนินการเรียบร้อย', color: '#157F4C', bg: '#E2F3EA' },
  REJECTED: { label: 'ยกเลิก/ไม่ประสงค์ซ่อม', color: '#C13540', bg: '#FBE4E4' },
}

export const ISSUE_STATUS_ORDER: IssueStatus[] = [
  'RECEIVED', 'IN_PROGRESS', 'WAIT_CUSTOMER_RETURN', 'SENT_TO_SUPPLIER',
  'SHIPPING_TO_CUSTOMER', 'WAIT_ONSITE', 'QUOTATION', 'DONE', 'REJECTED',
]

// A claim is "open" until it is resolved or rejected.
export const ISSUE_OPEN_STATUSES: IssueStatus[] = ISSUE_STATUS_ORDER.filter((s) => s !== 'DONE' && s !== 'REJECTED')

export const ISSUE_METHOD: Record<IssueMethod, string> = {
  REMOTE: 'Remote (รีโมท)',
  ONSITE: 'Onsite (หน้างาน)',
}

export const ISSUE_WARRANTY: Record<IssueWarranty, { label: string; color: string; bg: string }> = {
  IN_WARRANTY: { label: 'อยู่ในระยะประกัน', color: '#157F4C', bg: '#E2F3EA' },
  OUT_OF_WARRANTY: { label: 'หมดประกัน', color: '#C13540', bg: '#FBE4E4' },
  NOT_COVERED: { label: 'ไม่เข้าเงื่อนไขประกัน', color: '#8492A6', bg: '#EEF1F5' },
  UNKNOWN: { label: 'ยังไม่ระบุประกัน', color: '#8492A6', bg: '#EEF1F5' },
}

// Auto-decide warranty from the unit's invoice warranty-end date (บิล +1 ปี).
export function warrantyStateFrom(warrantyEndISO: string | null | undefined, now: Date = new Date()): IssueWarranty {
  if (!warrantyEndISO) return 'UNKNOWN'
  const end = new Date(warrantyEndISO)
  if (isNaN(end.getTime())) return 'UNKNOWN'
  return end.getTime() >= now.getTime() ? 'IN_WARRANTY' : 'OUT_OF_WARRANTY'
}

// Timeline event presentation.
export const ISSUE_EVENT: Record<IssueEventType, { label: string; icon: string; color: string }> = {
  CREATED: { label: 'รับแจ้งปัญหา', icon: '📩', color: '#B45309' },
  STATUS_CHANGED: { label: 'เปลี่ยนสถานะ', icon: '🔄', color: '#1B5FD9' },
  SOLUTION_UPDATED: { label: 'บันทึกวิธีแก้ไข', icon: '🛠️', color: '#157F4C' },
  WARRANTY_SET: { label: 'ระบุการรับประกัน', icon: '🛡️', color: '#6D28D9' },
  PART_USED: { label: 'ใช้อะไหล่', icon: '📦', color: '#C2410C' },
  RATED: { label: 'โรงพยาบาลให้คะแนน', icon: '⭐', color: '#D97706' },
}
