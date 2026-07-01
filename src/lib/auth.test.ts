import { describe, it, expect } from 'vitest'
import { verifyCredentials } from './credentials'

describe('verifyCredentials', () => {
  it('returns user for correct password', async () => {
    const u = await verifyCredentials('office1', '1234')
    expect(u?.role).toBe('OFFICE')
  })
  it('returns null for wrong password', async () => {
    const u = await verifyCredentials('office1', 'wrong')
    expect(u).toBeNull()
  })
  it('returns null for unknown user', async () => {
    const u = await verifyCredentials('nobody', '1234')
    expect(u).toBeNull()
  })
})
