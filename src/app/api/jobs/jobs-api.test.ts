import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('job update persists', () => {
  it('updates quantity via prisma (integration proxy for PUT)', async () => {
    const job = await prisma.job.findFirstOrThrow()
    const updated = await prisma.job.update({ where: { id: job.id }, data: { quantity: job.quantity + 1 } })
    expect(updated.quantity).toBe(job.quantity + 1)
    await prisma.job.update({ where: { id: job.id }, data: { quantity: job.quantity } })
    await prisma.$disconnect()
  })
})
