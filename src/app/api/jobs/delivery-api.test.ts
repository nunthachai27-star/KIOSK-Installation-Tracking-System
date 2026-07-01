import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('delivery upsert', () => {
  it('creates then updates a delivery record 1:1', async () => {
    const job = await prisma.job.findFirstOrThrow()
    const up = await prisma.deliveryRecord.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, trackingNo: 'TRK-TEST', status: 'SHIPPING' },
      update: { trackingNo: 'TRK-TEST-2' },
    })
    expect(up.jobId).toBe(job.id)

    const updated = await prisma.deliveryRecord.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, trackingNo: 'TRK-TEST', status: 'SHIPPING' },
      update: { trackingNo: 'TRK-TEST-2' },
    })
    expect(updated.trackingNo).toBe('TRK-TEST-2')

    await prisma.deliveryRecord.deleteMany({ where: { jobId: job.id } })
    await prisma.$disconnect()
  })
})
