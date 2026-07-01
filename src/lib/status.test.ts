import { describe, it, expect } from 'vitest'
import { isOverdue, stepForStatus, statusLabel } from './status'

describe('stepForStatus', () => {
  it('maps INSTALLING to step 3', () => {
    expect(stepForStatus('INSTALLING')).toBe(3)
  })
  it('maps DATA_ENTRY to step 1', () => {
    expect(stepForStatus('DATA_ENTRY')).toBe(1)
  })
  it('maps WAIT_INVOICE to step 4', () => {
    expect(stepForStatus('WAIT_INVOICE')).toBe(4)
  })
})

describe('isOverdue', () => {
  const now = new Date('2026-07-15T00:00:00Z')
  it('is true when due date passed and job open', () => {
    expect(isOverdue({ deliveryDueDate: new Date('2026-07-10'), currentStatus: 'INSTALLING' }, now)).toBe(true)
  })
  it('is false when closed', () => {
    expect(isOverdue({ deliveryDueDate: new Date('2026-07-10'), currentStatus: 'CLOSED' }, now)).toBe(false)
  })
  it('is false when no due date', () => {
    expect(isOverdue({ deliveryDueDate: null, currentStatus: 'INSTALLING' }, now)).toBe(false)
  })
})

describe('statusLabel', () => {
  it('returns Thai label', () => {
    expect(statusLabel('INSTALLING')).toBe('กำลังติดตั้ง')
  })
})
