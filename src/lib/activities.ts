import { prisma } from './prisma'

export function dayRange(d: Date): { from: Date; to: Date } {
  const from = new Date(d); from.setHours(0, 0, 0, 0)
  const to = new Date(d); to.setHours(23, 59, 59, 999)
  return { from, to }
}

export async function getActivitiesBetween(from: Date, to: Date, userId?: string) {
  return prisma.jobActivity.findMany({
    where: { activityDate: { gte: from, lte: to }, ...(userId ? { responsibleUserId: userId } : {}) },
    include: { job: { include: { hospital: true } } },
    orderBy: { activityDate: 'asc' },
  })
}
