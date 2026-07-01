import { prisma } from './prisma'
import { isOverdue } from './status'

export async function getSummary(now: Date) {
  const jobs = await prisma.job.findMany({ select: { currentStatus: true, deliveryDueDate: true } })
  const total = jobs.length
  const toShip = jobs.filter(j => j.currentStatus === 'READY_TO_SHIP').length
  const toHandover = jobs.filter(j => j.currentStatus === 'HANDED_OVER' || j.currentStatus === 'WAIT_INVOICE').length
  const overdue = jobs.filter(j => isOverdue(j, now)).length
  return { total, toShip, toHandover, overdue }
}

export async function getJobList() {
  // Ordered by contract start date, then contract end date (jobs without those
  // dates sort last). Falls back to updatedAt for a stable order.
  return prisma.job.findMany({
    include: { hospital: true },
    orderBy: [
      { contractStartDate: { sort: 'asc', nulls: 'last' } },
      { contractEndDate: { sort: 'asc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ],
  })
}
