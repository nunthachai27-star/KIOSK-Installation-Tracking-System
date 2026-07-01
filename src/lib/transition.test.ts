import { describe, it, expect } from 'vitest'
import { isValidStatus } from './transition'

describe('isValidStatus', () => {
  it('accepts a known JobStatus value', () => {
    expect(isValidStatus('INSTALLING')).toBe(true)
  })

  it('rejects an unknown value', () => {
    expect(isValidStatus('FOO')).toBe(false)
  })
})
