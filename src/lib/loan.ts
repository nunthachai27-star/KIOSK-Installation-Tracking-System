export type LoanLevel = 'OPEN' | 'DUE_SOON' | 'OVERDUE' | 'RETURNED'

export const LOAN_LEVEL_META: Record<LoanLevel, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'ยืมอยู่', color: '#1B5FD9', bg: '#E4EEFF' },
  DUE_SOON: { label: 'ใกล้ครบกำหนด', color: '#B45309', bg: '#FBEBCB' },
  OVERDUE: { label: 'เกินกำหนด', color: '#C13540', bg: '#FBE4E4' },
  RETURNED: { label: 'คืนแล้ว', color: '#157F4C', bg: '#E2F3EA' },
}

// Warn this many days before the due date.
export const DUE_SOON_DAYS = 3

const DAY_MS = 86_400_000

// Whole days from `now` until `due` (negative once the due date has passed).
// Both ends are floored to midnight so a loan due today reads as 0, not -0.4.
export function daysUntilDue(due: Date, now: Date): number {
  const d = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())
  const n = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((d - n) / DAY_MS)
}

export function loanLevel(loan: { dueDate: Date; returnedAt: Date | null }, now: Date): LoanLevel {
  if (loan.returnedAt) return 'RETURNED'
  const left = daysUntilDue(loan.dueDate, now)
  if (left < 0) return 'OVERDUE'
  if (left <= DUE_SOON_DAYS) return 'DUE_SOON'
  return 'OPEN'
}
