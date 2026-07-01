import { describe, it, expect } from 'vitest'
import { getSummary } from './dashboard'

describe('getSummary', () => {
  it('returns non-negative counts and detects overdue from seed', async () => {
    const s = await getSummary(new Date('2026-07-01T00:00:00Z'))
    expect(s.total).toBeGreaterThanOrEqual(5)
    expect(s.overdue).toBeGreaterThanOrEqual(1) // JOB-0129 due 2026-06-20, PROBLEM
  })
})
