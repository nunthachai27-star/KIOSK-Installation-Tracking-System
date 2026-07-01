import { describe, it, expect } from 'vitest'
import { safeFileName } from './upload'

describe('safeFileName', () => {
  it('slugifies and keeps extension', () => {
    const n = safeFileName('รูป หน้างาน (1).JPG')
    expect(n.endsWith('.jpg')).toBe(true)
    expect(n).not.toContain(' ')
  })
})
