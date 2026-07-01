import { describe, it, expect } from 'vitest'
import { dayRange } from './activities'

describe('dayRange', () => {
  it('returns start and end of the given day', () => {
    const { from, to } = dayRange(new Date('2026-07-01T13:45:00'))
    expect(from.getHours()).toBe(0)
    expect(to.getHours()).toBe(23)
  })
})
