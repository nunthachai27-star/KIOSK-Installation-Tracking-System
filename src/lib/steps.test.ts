import { describe, it, expect } from 'vitest'
import { buildSteps } from './steps'

describe('buildSteps', () => {
  it('marks earlier steps done, current active, later todo', () => {
    const s = buildSteps(3)
    expect(s.map(x => x.state)).toEqual(['done', 'done', 'active', 'todo'])
    expect(s[0].label).toBe('ข้อมูลงาน')
  })
})
