import { describe, it, expect } from 'vitest'
import { daysUntilDue, loanLevel } from './loan'

const at = (iso: string) => new Date(iso)

describe('daysUntilDue', () => {
  const now = at('2026-07-20T15:30:00')
  it('counts whole days ahead regardless of time of day', () => {
    expect(daysUntilDue(at('2026-07-23T00:00:00'), now)).toBe(3)
  })
  it('is 0 on the due date itself', () => {
    expect(daysUntilDue(at('2026-07-20T00:00:00'), now)).toBe(0)
  })
  it('goes negative once the date has passed', () => {
    expect(daysUntilDue(at('2026-07-18T00:00:00'), now)).toBe(-2)
  })
})

describe('loanLevel', () => {
  const now = at('2026-07-20T09:00:00')

  it('flags a loan past its due date as overdue', () => {
    expect(loanLevel({ dueDate: at('2026-07-19'), returnedAt: null }, now)).toBe('OVERDUE')
  })
  it('still warns on the due date itself rather than calling it overdue', () => {
    expect(loanLevel({ dueDate: at('2026-07-20'), returnedAt: null }, now)).toBe('DUE_SOON')
  })
  it('warns within the 3-day window', () => {
    expect(loanLevel({ dueDate: at('2026-07-23'), returnedAt: null }, now)).toBe('DUE_SOON')
  })
  it('stays plain open when the due date is further out', () => {
    expect(loanLevel({ dueDate: at('2026-07-24'), returnedAt: null }, now)).toBe('OPEN')
  })
  it('never reports overdue once returned, even if returned late', () => {
    expect(loanLevel({ dueDate: at('2026-07-01'), returnedAt: at('2026-07-05') }, now)).toBe('RETURNED')
  })
})
