// ค่าคงที่ + ป้ายชื่อ (ไทย) ของแถบ "พัฒนา" — ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ.
// ไฟล์นี้ต้องไม่ import prisma/next เพื่อให้ฝัง client component ได้อย่างปลอดภัย.

export const DEV_STATUSES = ['NEW', 'REVIEWING', 'IN_PROGRESS', 'TESTING', 'DONE'] as const
export type DevStatus = (typeof DEV_STATUSES)[number]

export const DEV_TYPES = ['BUG', 'FEATURE', 'UI', 'IMPROVEMENT'] as const
export type DevType = (typeof DEV_TYPES)[number]

export const DEV_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type DevPriority = (typeof DEV_PRIORITIES)[number]

export const STATUS_META: Record<DevStatus, { label: string; emoji: string; hint: string; tone: string }> = {
  NEW:         { label: 'ใหม่',       emoji: '📥', hint: 'รอทีมพัฒนา',     tone: 'new' },
  REVIEWING:   { label: 'กำลังดู',    emoji: '👀', hint: 'ทีมพัฒนารับเรื่องแล้ว', tone: 'review' },
  IN_PROGRESS: { label: 'กำลังทำ',    emoji: '🔧', hint: 'กำลังแก้ไข',     tone: 'progress' },
  TESTING:     { label: 'รอทดสอบ',    emoji: '🧪', hint: 'ให้เทคนิคตรวจ',  tone: 'test' },
  DONE:        { label: 'เสร็จ',      emoji: '✅', hint: 'ปิดงานแล้ว',     tone: 'done' },
}

export const TYPE_META: Record<DevType, { label: string; emoji: string; tone: string }> = {
  BUG:         { label: 'บั๊ก',      emoji: '🐞', tone: 'bug' },
  FEATURE:     { label: 'ฟีเจอร์',   emoji: '✨', tone: 'feat' },
  UI:          { label: 'ปรับ UI',   emoji: '🎨', tone: 'ui' },
  IMPROVEMENT: { label: 'ปรับปรุง',  emoji: '⚡', tone: 'imp' },
}

export const PRIORITY_META: Record<DevPriority, { label: string; tone: string }> = {
  HIGH:   { label: 'ด่วนมาก',      tone: 'high' },
  MEDIUM: { label: 'ปกติ',         tone: 'mid' },
  LOW:    { label: 'ไว้ทำทีหลัง',  tone: 'low' },
}

export function isDevStatus(v: unknown): v is DevStatus {
  return typeof v === 'string' && (DEV_STATUSES as readonly string[]).includes(v)
}
export function isDevType(v: unknown): v is DevType {
  return typeof v === 'string' && (DEV_TYPES as readonly string[]).includes(v)
}
export function isDevPriority(v: unknown): v is DevPriority {
  return typeof v === 'string' && (DEV_PRIORITIES as readonly string[]).includes(v)
}

// แสดงเลขคำขอเป็น DEV-001
export function devCode(code: number): string {
  return 'DEV-' + String(code).padStart(3, '0')
}
