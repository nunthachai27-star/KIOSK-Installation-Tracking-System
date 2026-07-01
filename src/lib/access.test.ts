import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { fieldCanAccessJob } from './access'

const prisma = new PrismaClient()

describe('fieldCanAccessJob', () => {
  it('allows the assigned FIELD user but denies an unassigned one', async () => {
    // From seed: JOB-2568-0142 is installerOwner=field2 (and has an activity for field2)
    const job = await prisma.job.findUniqueOrThrow({ where: { jobCode: 'JOB-2568-0142' } })
    const field2 = await prisma.user.findUniqueOrThrow({ where: { username: 'field2' } })
    const field1 = await prisma.user.findUniqueOrThrow({ where: { username: 'field1' } })

    expect(await fieldCanAccessJob(job.id, field2.id)).toBe(true)
    expect(await fieldCanAccessJob(job.id, field1.id)).toBe(false)
    await prisma.$disconnect()
  })

  it('returns false when userId is undefined', async () => {
    const job = await prisma.job.findFirstOrThrow()
    expect(await fieldCanAccessJob(job.id, undefined)).toBe(false)
  })
})
