import { prisma } from './prisma'
import { stepForStatus } from './status'
import type { JobStatus, IssueStatus, IssueWarranty } from '@prisma/client'

export type ExecDashboard = Awaited<ReturnType<typeof getExecDashboard>>

const STEP_LABELS = ['ข้อมูลงาน', 'ลง Serial', 'QC', 'จัดส่ง', 'ติดตั้ง & ส่งมอบ', 'งานบิล']

export async function getExecDashboard(now: Date = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [
    totalAgg, statusGroups, productGroups, overdue, hospitalRows,
    monthCount, yearCount, plannedCount, closedCount,
    jobsBy, serialBy, qcBy, delBy, insBy, hanBy, invBy, issueBy, users,
    claimStatus, claimWarranty, claimTotal,
  ] = await Promise.all([
    prisma.job.aggregate({ where: { isPlanned: false }, _count: true, _sum: { salesAmount: true } }),
    prisma.job.groupBy({ by: ['currentStatus'], where: { isPlanned: false }, _count: true }),
    prisma.job.groupBy({ by: ['productType'], where: { isPlanned: false }, _count: true, _sum: { salesAmount: true } }),
    prisma.job.count({ where: { isPlanned: false, deliveryDueDate: { lt: now }, currentStatus: { notIn: ['CLOSED', 'CANCELLED'] } } }),
    prisma.job.findMany({ where: { isPlanned: false }, distinct: ['hospitalId'], select: { hospitalId: true } }),
    prisma.job.count({ where: { isPlanned: false, createdAt: { gte: monthStart } } }),
    prisma.job.count({ where: { isPlanned: false, createdAt: { gte: yearStart } } }),
    prisma.job.count({ where: { isPlanned: true } }),
    prisma.job.count({ where: { isPlanned: false, currentStatus: 'CLOSED' } }),
    // per-staff work counts (all-time)
    prisma.job.groupBy({ by: ['createdById'], where: { createdById: { not: null } }, _count: true }),
    prisma.serialRecord.groupBy({ by: ['staffId'], where: { staffId: { not: null } }, _count: true }),
    prisma.unitQc.groupBy({ by: ['staffId'], where: { staffId: { not: null } }, _count: true }),
    prisma.deliveryRecord.groupBy({ by: ['recordedById'], where: { recordedById: { not: null } }, _count: true }),
    prisma.installationRecord.groupBy({ by: ['recordedById'], where: { recordedById: { not: null } }, _count: true }),
    prisma.handoverRecord.groupBy({ by: ['recordedById'], where: { recordedById: { not: null } }, _count: true }),
    prisma.invoiceRecord.groupBy({ by: ['recordedById'], where: { recordedById: { not: null } }, _count: true }),
    prisma.issue.groupBy({ by: ['reporterId'], where: { reporterId: { not: null } }, _count: true }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.issue.groupBy({ by: ['status'], _count: true }),
    prisma.issue.groupBy({ by: ['warrantyState'], _count: true }),
    prisma.issue.count(),
  ])

  // Department: totals + step distribution.
  const totalJobs = totalAgg._count
  const totalSales = totalAgg._sum.salesAmount?.toNumber() ?? 0
  const stepCounts = [0, 0, 0, 0, 0, 0]
  for (const g of statusGroups) stepCounts[stepForStatus(g.currentStatus as JobStatus) - 1] += g._count
  const openJobs = totalJobs - closedCount

  // Sales by product type.
  const products = productGroups
    .map((g) => ({ productType: g.productType, count: g._count, sales: g._sum.salesAmount?.toNumber() ?? 0 }))
    .sort((a, b) => b.sales - a.sales)

  // Per-staff performance.
  const nameOf = new Map(users.map((u) => [u.id, u.name]))
  type Perf = { jobs: number; serials: number; qc: number; delivery: number; install: number; handover: number; invoice: number; issues: number }
  const perf = new Map<string, Perf>()
  const bump = (id: string | null, key: keyof Perf, n: number) => {
    if (!id) return
    const p = perf.get(id) ?? { jobs: 0, serials: 0, qc: 0, delivery: 0, install: 0, handover: 0, invoice: 0, issues: 0 }
    p[key] += n; perf.set(id, p)
  }
  for (const g of jobsBy) bump(g.createdById, 'jobs', g._count)
  for (const g of serialBy) bump(g.staffId, 'serials', g._count)
  for (const g of qcBy) bump(g.staffId, 'qc', g._count)
  for (const g of delBy) bump(g.recordedById, 'delivery', g._count)
  for (const g of insBy) bump(g.recordedById, 'install', g._count)
  for (const g of hanBy) bump(g.recordedById, 'handover', g._count)
  for (const g of invBy) bump(g.recordedById, 'invoice', g._count)
  for (const g of issueBy) bump(g.reporterId, 'issues', g._count)
  const staffBase = [...perf.entries()]
    .map(([id, p]) => ({
      id,
      name: nameOf.get(id) ?? '—',
      ...p,
      rating: 0, ratingCount: 0,
      total: p.jobs + p.serials + p.qc + p.delivery + p.install + p.handover + p.invoice + p.issues,
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)

  // Claims overview.
  const claimByStatus = claimStatus.map((g) => ({ status: g.status as IssueStatus, count: g._count }))
  const warrantyMap = new Map(claimWarranty.map((g) => [g.warrantyState as IssueWarranty, g._count]))

  // ── Additional executive views ──
  const twelveAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const in60 = new Date(now.getTime() + 60 * 86400000)
  const in90 = new Date(now.getTime() + 90 * 86400000)
  const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const [
    trendJobs, contractExp, warranty90, methodGroups, claimProductRows,
    partRows, provinceGroups, spareStock, customerGroups, hospitalsAll, closedJobs, deliveriesOnTime, overdueJobs, ratingAgg, ratingByStaff, issueUnitRows,
  ] = await Promise.all([
    prisma.job.findMany({ where: { isPlanned: false, contractStartDate: { gte: twelveAgo } }, select: { contractStartDate: true, salesAmount: true } }),
    prisma.job.findMany({ where: { isPlanned: false, contractEndDate: { gte: now, lte: in90 } }, select: { contractEndDate: true, productType: true, hospital: { select: { name: true } } }, orderBy: { contractEndDate: 'asc' } }),
    prisma.invoiceRecord.count({ where: { warrantyEndDate: { gte: now, lte: in90 } } }),
    prisma.issue.groupBy({ by: ['method'], _count: true }),
    prisma.issue.findMany({ select: { productType: true, job: { select: { productType: true } } } }),
    prisma.claimPart.findMany({ select: { name: true, qty: true, unitPrice: true } }),
    prisma.job.groupBy({ by: ['province'], where: { isPlanned: false }, _count: true, _sum: { salesAmount: true } }),
    prisma.sparePart.findMany({ select: { sellPrice: true, stockQty: true } }),
    prisma.job.groupBy({ by: ['hospitalId'], where: { isPlanned: false }, _count: true, _sum: { salesAmount: true }, orderBy: { _sum: { salesAmount: 'desc' } }, take: 10 }),
    prisma.hospital.findMany({ select: { id: true, name: true } }),
    prisma.job.findMany({ where: { isPlanned: false, currentStatus: 'CLOSED' }, select: { createdAt: true, updatedAt: true } }),
    prisma.deliveryRecord.findMany({ where: { shippedDate: { not: null }, job: { deliveryDueDate: { not: null } } }, select: { shippedDate: true, job: { select: { deliveryDueDate: true } } } }),
    prisma.job.findMany({ where: { isPlanned: false, deliveryDueDate: { lt: now }, currentStatus: { notIn: ['CLOSED', 'CANCELLED'] } }, select: { jobCode: true, deliveryDueDate: true, currentStatus: true, salesAmount: true, hospital: { select: { name: true } } }, orderBy: { deliveryDueDate: 'asc' } }),
    prisma.issue.aggregate({ where: { rating: { not: null } }, _avg: { rating: true }, _count: true }),
    prisma.issue.groupBy({ by: ['assignedToId'], where: { rating: { not: null }, assignedToId: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.issue.findMany({ select: { machineSerial: true, hospitalName: true, productType: true, serial: { select: { serialNo: true, job: { select: { productType: true, hospital: { select: { name: true } } } } } } } }),
  ])
  const satisfaction = { avg: ratingAgg._avg.rating ?? 0, count: ratingAgg._count }
  // Per-staff satisfaction (rating attributed to the resolver).
  const ratingStaffMap = new Map(ratingByStaff.map((g) => [g.assignedToId as string, { avg: g._avg.rating ?? 0, count: g._count.rating }]))
  const staff = staffBase.map((s) => {
    const r = ratingStaffMap.get(s.id)
    return { ...s, rating: r?.avg ?? 0, ratingCount: r?.count ?? 0 }
  })

  // Repeat failures: equipment (by S/N) reported 2+ times — signals recurring faults / bad units.
  const unitMap = new Map<string, { serialNo: string; count: number; hospital: string; productType: string }>()
  for (const i of issueUnitRows) {
    const sn = (i.serial?.serialNo ?? i.machineSerial ?? '').trim()
    if (sn.length < 4 || !/[A-Za-z0-9]/.test(sn)) continue
    const u = unitMap.get(sn) ?? { serialNo: sn, count: 0, hospital: i.serial?.job.hospital.name ?? i.hospitalName ?? '—', productType: i.serial?.job.productType ?? i.productType ?? '—' }
    u.count++; unitMap.set(sn, u)
  }
  const repeatUnits = [...unitMap.values()].filter((u) => u.count >= 2).sort((a, b) => b.count - a.count)
  const repeatFailures = { units: repeatUnits.slice(0, 10), totalUnits: repeatUnits.length, totalReports: repeatUnits.reduce((s, u) => s + u.count, 0) }

  // Pipeline steps (with overdue count per step) + urgent list + hospitals to follow.
  const stepOverdue = [0, 0, 0, 0, 0, 0]
  for (const j of overdueJobs) stepOverdue[stepForStatus(j.currentStatus) - 1]++
  const steps = STEP_LABELS.map((label, i) => ({ label, count: stepCounts[i], overdue: stepOverdue[i], pct: totalJobs ? Math.round((stepCounts[i] / totalJobs) * 100) : 0 }))
  const daysOver = (d: Date) => Math.max(0, Math.ceil((now.getTime() - d.getTime()) / 86400000))
  const urgent = overdueJobs.slice(0, 7).map((j) => ({
    jobCode: j.jobCode, hospital: j.hospital.name, stepNo: stepForStatus(j.currentStatus),
    step: STEP_LABELS[stepForStatus(j.currentStatus) - 1], daysOverdue: daysOver(j.deliveryDueDate!),
  }))
  const followMap = new Map<string, { overdue: number; sales: number }>()
  for (const j of overdueJobs) {
    const f = followMap.get(j.hospital.name) ?? { overdue: 0, sales: 0 }
    f.overdue++; f.sales += j.salesAmount.toNumber(); followMap.set(j.hospital.name, f)
  }
  const followHospitals = [...followMap.entries()].map(([name, f]) => ({ name, ...f })).sort((a, b) => b.overdue - a.overdue).slice(0, 5)

  // 1. Monthly trend (12 months by contract start).
  const trendBucket = new Map<string, { jobs: number; sales: number }>()
  for (const j of trendJobs) {
    if (!j.contractStartDate) continue
    const k = `${j.contractStartDate.getFullYear()}-${j.contractStartDate.getMonth()}`
    const b = trendBucket.get(k) ?? { jobs: 0, sales: 0 }
    b.jobs++; b.sales += j.salesAmount.toNumber(); trendBucket.set(k, b)
  }
  const trend = Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(twelveAgo.getFullYear(), twelveAgo.getMonth() + i, 1)
    const b = trendBucket.get(`${dt.getFullYear()}-${dt.getMonth()}`) ?? { jobs: 0, sales: 0 }
    return { label: `${THAI_MONTHS[dt.getMonth()]} ${String((dt.getFullYear() + 543) % 100).padStart(2, '0')}`, jobs: b.jobs, sales: b.sales }
  })
  const pctDelta = (c: number, p: number) => (p > 0 ? Math.round(((c - p) / p) * 100) : c > 0 ? 100 : 0)
  const deptTrend = { jobsPct: pctDelta(trend[11].jobs, trend[10].jobs), salesPct: pctDelta(trend[11].sales, trend[10].sales) }

  // 2. Expiring contracts / warranties.
  const dLeft = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86400000)
  const expiring = {
    c30: contractExp.filter((j) => j.contractEndDate! <= in30).length,
    c60: contractExp.filter((j) => j.contractEndDate! <= in60).length,
    c90: contractExp.length,
    w90: warranty90,
    list: contractExp.slice(0, 8).map((j) => ({ hospital: j.hospital.name, productType: j.productType, daysLeft: dLeft(j.contractEndDate!) })),
  }

  // 3. Service / reliability analytics.
  const methodMap = new Map(methodGroups.map((g) => [g.method ?? 'NONE', g._count]))
  const prodClaim = new Map<string, number>()
  for (const i of claimProductRows) {
    const p = i.job?.productType ?? i.productType ?? '(ไม่ระบุ)'
    prodClaim.set(p, (prodClaim.get(p) ?? 0) + 1)
  }
  const partAgg = new Map<string, { qty: number; value: number }>()
  let partsValue = 0
  for (const p of partRows) {
    const a = partAgg.get(p.name) ?? { qty: 0, value: 0 }
    const v = (p.unitPrice?.toNumber() ?? 0) * p.qty
    a.qty += p.qty; a.value += v; partAgg.set(p.name, a); partsValue += v
  }
  const service = {
    remote: methodMap.get('REMOTE') ?? 0,
    onsite: methodMap.get('ONSITE') ?? 0,
    unspecified: methodMap.get('NONE') ?? 0,
    inWarranty: warrantyMap.get('IN_WARRANTY') ?? 0,
    outWarranty: warrantyMap.get('OUT_OF_WARRANTY') ?? 0,
    byProduct: [...prodClaim.entries()].map(([product, count]) => ({ product, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    parts: [...partAgg.entries()].map(([name, a]) => ({ name, qty: a.qty })).sort((a, b) => b.qty - a.qty).slice(0, 6),
    partsValue,
  }

  // 4. Provinces.
  const provinces = provinceGroups
    .map((g) => ({ province: g.province, jobs: g._count, sales: g._sum.salesAmount?.toNumber() ?? 0 }))
    .sort((a, b) => b.sales - a.sales)
  const provinceTop = provinces.slice(0, 8)

  // 5. Inventory value + top customers.
  let stockValue = 0, lowStock = 0
  for (const s of spareStock) { stockValue += (s.sellPrice?.toNumber() ?? 0) * s.stockQty; if (s.stockQty <= 0) lowStock++ }
  const hospName = new Map(hospitalsAll.map((h) => [h.id, h.name]))
  const customers = customerGroups.map((g) => ({ name: hospName.get(g.hospitalId) ?? '—', jobs: g._count, sales: g._sum.salesAmount?.toNumber() ?? 0 }))

  // 6. Operational efficiency.
  const cycleDays = closedJobs.map((j) => (j.updatedAt.getTime() - j.createdAt.getTime()) / 86400000).filter((d) => d >= 0)
  const avgCycleDays = cycleDays.length ? Math.round(cycleDays.reduce((s, d) => s + d, 0) / cycleDays.length) : null
  const onTime = deliveriesOnTime.filter((d) => d.shippedDate! <= d.job.deliveryDueDate!).length
  const efficiency = {
    completionRate: totalJobs ? Math.round((closedCount / totalJobs) * 100) : 0,
    avgCycleDays,
    onTimeRate: deliveriesOnTime.length ? Math.round((onTime / deliveriesOnTime.length) * 100) : null,
    onTimeBase: deliveriesOnTime.length,
    overdue,
  }

  return {
    generatedAt: now.toISOString(),
    dept: {
      totalJobs, totalSales, openJobs, closedCount, overdue,
      hospitals: hospitalRows.length, monthCount, yearCount, plannedCount,
      steps, trend: deptTrend,
    },
    urgent,
    followHospitals,
    products,
    staff,
    claims: {
      total: claimTotal,
      byStatus: claimByStatus,
      inWarranty: warrantyMap.get('IN_WARRANTY') ?? 0,
      outWarranty: warrantyMap.get('OUT_OF_WARRANTY') ?? 0,
    },
    trend,
    expiring,
    service,
    provinces: provinceTop,
    provinceCount: provinces.length,
    inventory: { stockValue, lowStock, kinds: spareStock.length },
    customers,
    efficiency,
    satisfaction,
    repeatFailures,
  }
}
