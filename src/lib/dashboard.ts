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

export async function getProductTypes(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    distinct: ['productType'],
    select: { productType: true },
    orderBy: { productType: 'asc' },
  })
  return rows.map(r => r.productType).filter(Boolean)
}

export async function getJobList(includeClosed = false) {
  // Newest first: order by contract start date (then end date) descending, so
  // the current/most-recent year shows on top. Jobs without dates sort last.
  // Closed jobs are hidden unless includeClosed is set.
  return prisma.job.findMany({
    where: includeClosed ? {} : { currentStatus: { not: 'CLOSED' } },
    include: { hospital: true },
    orderBy: [
      { contractStartDate: { sort: 'desc', nulls: 'last' } },
      { contractEndDate: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ],
  })
}

export async function countClosed(): Promise<number> {
  return prisma.job.count({ where: { currentStatus: 'CLOSED' } })
}
