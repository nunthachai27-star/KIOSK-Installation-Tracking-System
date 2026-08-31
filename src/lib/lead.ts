// สถานะติดตามผู้สนใจโปรดัก — ใช้ร่วมทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ (ไม่ import prisma/next).
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_META: Record<LeadStatus, { label: string; emoji: string; color: string; bg: string }> = {
  NEW:       { label: 'ใหม่',         emoji: '🆕', color: '#B4740E', bg: '#FBF0DC' },
  CONTACTED: { label: 'ติดต่อแล้ว',   emoji: '📞', color: '#2563C9', bg: '#E4EEFD' },
  QUOTED:    { label: 'เสนอราคาแล้ว', emoji: '📄', color: '#7A44C6', bg: '#F0E8FB' },
  WON:       { label: 'ปิดการขาย',    emoji: '✅', color: '#1F8A54', bg: '#E1F3E9' },
  LOST:      { label: 'ปิด/ไม่สนใจ',  emoji: '🚫', color: '#8A94A6', bg: '#EEF1F5' },
}

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === 'string' && (LEAD_STATUSES as readonly string[]).includes(v)
}
