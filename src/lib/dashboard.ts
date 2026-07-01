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
  // Newest first: order by contract start date (then end date) descending, so
  // the current/most-recent year shows on top. Jobs without dates sort last.
  return prisma.job.findMany({
    include: { hospital: true },
    orderBy: [
      { contractStartDate: { sort: 'desc', nulls: 'last' } },
      { contractEndDate: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ],
  })
}
