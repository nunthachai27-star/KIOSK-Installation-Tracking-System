import { describe, it, expect } from 'vitest'
import { canCloseJob } from './close'

describe('canCloseJob', () => {
  it('blocks when invoice not issued', () => {
    const r = canCloseJob({ handover: { handoverStatus: 'DELIVERED' }, invoice: { status: 'PENDING' } })
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('ยังไม่เปิดใบแจ้งหนี้')
  })
  it('allows when handover delivered and invoice issued', () => {
    const r = canCloseJob({ handover: { handoverStatus: 'DELIVERED' }, invoice: { status: 'ISSUED' } })
    expect(r.ok).toBe(true)
  })
})
