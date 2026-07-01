import { describe, it, expect } from 'vitest'
import { formatBaht, formatQty } from './format'

describe('formatBaht', () => {
  it('formats a number with thousands separators', () => {
    expect(formatBaht(1850000)).toBe('1,850,000')
  })
  it('accepts a numeric string', () => {
    expect(formatBaht('420000')).toBe('420,000')
  })
})

describe('formatQty', () => {
  it('formats integer quantity', () => {
    expect(formatQty(2)).toBe('2')
  })
})
