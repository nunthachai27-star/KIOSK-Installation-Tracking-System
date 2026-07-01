import { describe, it, expect } from 'vitest'
import { normalizeSerial } from './serial'

describe('normalizeSerial', () => {
  it('uppercases and trims', () => {
    expect(normalizeSerial('  ksk-24a-00871 ')).toBe('KSK-24A-00871')
  })
})
