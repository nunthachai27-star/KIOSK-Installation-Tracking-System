import { describe, it, expect } from 'vitest'
import { jobInput } from './jobSchema'

describe('jobInput', () => {
  it('requires jobCode and hospitalId', () => {
    const r = jobInput.safeParse({ productType: 'Kiosk HI-END', quantity: 2 })
    expect(r.success).toBe(false)
  })
  it('coerces salesAmount and quantity', () => {
    const r = jobInput.parse({ jobCode: 'J1', hospitalId: 'h1', province: 'ขอนแก่น', productType: 'Kiosk HI-END', quantity: '2', salesAmount: '1850000' })
    expect(r.quantity).toBe(2)
    expect(r.salesAmount).toBe(1850000)
  })
})
