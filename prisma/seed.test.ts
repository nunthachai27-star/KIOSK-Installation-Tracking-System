import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('seed data', () => {
  it('has the office user and >=5 jobs', async () => {
    const office = await prisma.user.findUnique({ where: { username: 'office1' } })
    expect(office?.role).toBe('OFFICE')
    const jobs = await prisma.job.count()
    expect(jobs).toBeGreaterThanOrEqual(5)
    await prisma.$disconnect()
  })
})
