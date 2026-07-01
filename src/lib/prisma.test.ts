import { describe, it, expect } from 'vitest'
import { prisma } from './prisma'

describe('prisma', () => {
  it('connects and runs a raw query', async () => {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    expect(rows).toBeTruthy()
    await prisma.$disconnect()
  })
})
