import type { JobStatus, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { isOverdue, PROGRESS_RANK } from './status'

export async function getSummary(now: Date) {
  // Stats reflect signed jobs (planned jobs live in their own registry).
  const jobs = await prisma.job.findMany({ where: { isPlanned: false }, select: { currentStatus: true, deliveryDueDate: true } })
  const total = jobs.length
  const toShip = jobs.filter(j => j.currentStatus === 'READY_TO_SHIP').length
  const toHandover = jobs.filter(j => j.currentStatus === 'HANDED_OVER' || j.currentStatus === 'WAIT_INVOICE').length
  const overdue = jobs.filter(j => isOverdue(j, now)).length
  return { total, toShip, toHandover, overdue }
}

// Count of planned (unsigned) jobs — shown as a link to the planned registry.
export function countPlanned(): Promise<number> {
  return prisma.job.count({ where: { isPlanned: true } })
}

// Monthly order-count + revenue for the dashboard charts.
// Orders are bucketed by createdAt (วันลงข้อมูลงาน), signed jobs only (planned
// excluded for now), cancelled excluded. Read-only aggregation — touches nothing.
export type DashboardData = {
  years: number[]      // CE years present in data, newest first
  year: number         // the selected/effective year (CE)
  orders: number[]     // 12 entries, index 0 = January
  revenue: number[]    // 12 entries, baht
}
const TH_OFFSET_MS = 7 * 60 * 60 * 1000 // bucket by Asia/Bangkok local month

export async function getDashboardData(selectedYearCE?: number): Promise<DashboardData> {
  const jobs = await prisma.job.findMany({
    where: { isPlanned: false, currentStatus: { not: 'CANCELLED' } },
    select: { createdAt: true, salesAmount: true },
  })

  const yearsSet = new Set<number>()
  const byYear = new Map<number, { orders: number[]; revenue: number[] }>()
  for (const j of jobs) {
    const th = new Date(j.createdAt.getTime() + TH_OFFSET_MS)
    const y = th.getUTCFullYear()
    const m = th.getUTCMonth()
    yearsSet.add(y)
    let b = byYear.get(y)
    if (!b) { b = { orders: Array(12).fill(0), revenue: Array(12).fill(0) }; byYear.set(y, b) }
    b.orders[m] += 1
    b.revenue[m] += Number(j.salesAmount)
  }

  const years = [...yearsSet].sort((a, b) => b - a)
  const year = selectedYearCE && yearsSet.has(selectedYearCE) ? selectedYearCE : (years[0] ?? new Date().getFullYear())
  const data = byYear.get(year) ?? { orders: Array(12).fill(0), revenue: Array(12).fill(0) }
  return { years, year, orders: data.orders, revenue: data.revenue }
}

export async function getProductTypes(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    distinct: ['productType'],
    select: { productType: true },
    orderBy: { productType: 'asc' },
  })
  return rows.map(r => r.productType).filter(Boolean)
}

// Distinct Buddhist-era years of contract start dates, newest first.
export async function getContractYears(): Promise<number[]> {
  const rows = await prisma.job.findMany({
    where: { contractStartDate: { not: null } },
    select: { contractStartDate: true },
  })
  const years = new Set<number>()
  for (const r of rows) {
    if (r.contractStartDate) years.add(r.contractStartDate.getUTCFullYear() + 543)
  }
  return [...years].sort((a, b) => b - a)
}

export async function getJobList(
  opts: { includeClosed?: boolean; productType?: string; status?: JobStatus; year?: number; planned?: boolean } = {},
) {
  const { includeClosed = false, productType, status, year, planned } = opts
  // Ordered by workflow progress (just-received on top, finished last); within
  // the same stage, most-recent contract first.
  const where: Prisma.JobWhereInput = {}
  // An explicit status filter takes precedence over the open/closed toggle.
  // Default view hides finished (CLOSED) and voided (CANCELLED) jobs; both
  // reappear under "แสดงทั้งหมด".
  if (status) where.currentStatus = status
  else if (!includeClosed) where.currentStatus = { notIn: ['CLOSED', 'CANCELLED'] }
  if (productType) where.productType = productType
  if (planned !== undefined) where.isPlanned = planned
  // year is Buddhist-era; match contract start dates within that CE year.
  if (year) {
    const ce = year - 543
    where.contractStartDate = { gte: new Date(Date.UTC(ce, 0, 1)), lt: new Date(Date.UTC(ce + 1, 0, 1)) }
  }

  const rows = await prisma.job.findMany({
    where,
    include: {
      hospital: true,
      delivery: { select: { shippedDate: true } },
      installation: { select: { remoteDate: true, result: true } },
      handover: { select: { checklistReceivedDate: true, handoverDate: true } },
      invoice: { select: { warrantyEndDate: true } },
      // BMS units + their MEMO-License tick, to flag jobs still needing a MEMO request.
      serials: { where: { serialType: 'BMS' }, select: { unitQc: { select: { memoLicense: true } } } },
    },
    orderBy: [
      { contractStartDate: { sort: 'desc', nulls: 'last' } },
      { contractEndDate: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ],
  })
  // MEMO License warning: PENDING only for active jobs that still have an unticked
  // unit. Closed/cancelled jobs never warn (treated as done).
  const withMemo = rows.map(({ serials, ...j }) => {
    const closed = j.currentStatus === 'CLOSED' || j.currentStatus === 'CANCELLED'
    const allTicked = serials.length > 0 && serials.every((s) => s.unitQc?.memoLicense)
    return { ...j, memoStatus: (closed || allTicked) ? 'DONE' as const : 'PENDING' as const }
  })
  // Stable sort by progress rank keeps the contract-date order within each stage.
  return withMemo.sort((a, b) => PROGRESS_RANK[a.currentStatus] - PROGRESS_RANK[b.currentStatus])
}

export async function countClosed(): Promise<number> {
  return prisma.job.count({ where: { currentStatus: 'CLOSED', isPlanned: false } })
}
