import type { Prisma } from '@prisma/client'

// เรื่องจาก Vira ที่ "ยังไม่มีคนรับ": ยังไม่มีผู้รับผิดชอบ และยังอยู่สถานะรับเรื่อง
// (กด "รับงาน" = ตั้งตัวเองเป็นผู้รับผิดชอบ + เปลี่ยนเป็นกำลังดำเนินการ → เสียงแจ้งเตือนหยุด)
export const VIRA_PENDING_WHERE: Prisma.IssueWhereInput = { viraKind: { not: null }, assignedToId: null, status: 'RECEIVED' }

// window event ที่ตัวแจ้งเตือนกระจายจำนวนค้างให้เมนูแสดงตัวเลข
export const VIRA_PENDING_EVENT = 'vira-pending'
// สั่งให้ตัวแจ้งเตือนเช็คใหม่ทันที (หลังกด "รับงาน")
export const VIRA_REFRESH_EVENT = 'vira-refresh'
