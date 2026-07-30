import type { PurchaseStatus } from '@prisma/client'

// Procurement pipeline — ordered for the step tracker + filters.
export const PURCHASE_STATUS_ORDER: PurchaseStatus[] = ['REQUESTED', 'APPROVED', 'ORDERED', 'PROCESSING_SHIPMENT', 'SHIPPING', 'RECEIVED', 'CANCELLED']

export const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; color: string; bg: string; step: number }> = {
  REQUESTED: { label: 'ขอซื้อ', color: '#5A6B82', bg: '#EDF0F4', step: 1 },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#9A6B10', bg: '#FAF0D8', step: 2 },
  ORDERED: { label: 'สั่งซื้อแล้ว', color: '#1B5FD9', bg: '#E4EEFF', step: 3 },
  PROCESSING_SHIPMENT: { label: 'กำลังดำเนินการจัดส่ง', color: '#0F766E', bg: '#D6F0EC', step: 4 },
  SHIPPING: { label: 'อยู่ระหว่างจัดส่ง', color: '#6D28D9', bg: '#F3EEFF', step: 5 },
  RECEIVED: { label: 'รับของแล้ว', color: '#157F4C', bg: '#E2F3EA', step: 6 },
  CANCELLED: { label: 'ยกเลิก', color: '#C13540', bg: '#FBE4E4', step: 0 },
}

// The forward steps shown on the tracker (CANCELLED is off-pipeline).
export const PURCHASE_STEPS: PurchaseStatus[] = ['REQUESTED', 'APPROVED', 'ORDERED', 'PROCESSING_SHIPMENT', 'SHIPPING', 'RECEIVED']

// Only these users may delete a purchase (by username).
export const PURCHASE_DELETE_USERNAMES = ['jakkrit', 'thanita', 'phattaradon']
