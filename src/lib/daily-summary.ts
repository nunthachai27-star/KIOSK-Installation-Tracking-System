import type { ActivityType } from '@prisma/client'
import { prisma } from './prisma'
import { ACTIVITY_LABEL } from './activity'

export type SummaryLine = { cat: string; text: string }
export type StaffSummary = { staffId: string; name: string; total: number; lines: SummaryLine[] }

// Per-staff work summary for a day, drawn from every record that carries a
// staff + timestamp: job creation, serial recording, per-unit QC, scheduled
// activities (Remote/handover/delivery…), and issue handling.
export async function getDailySummary(from: Date, to: Date): Promise<StaffSummary[]> {
  const inDay = { gte: from, lte: to }
  const [jobsCreated, serialRecs, unitQcs, activities, issues, deliveries, installs, handovers, invoices, users] = await Promise.all([
    prisma.job.findMany({ where: { createdById: { not: null }, createdAt: inDay }, select: { createdById: true } }),
    prisma.serialRecord.findMany({ where: { staffId: { not: null }, updatedAt: inDay }, select: { staffId: true } }),
    prisma.unitQc.findMany({ where: { staffId: { not: null }, updatedAt: inDay }, select: { staffId: true } }),
    prisma.jobActivity.findMany({ where: { responsibleUserId: { not: null }, activityDate: inDay }, select: { responsibleUserId: true, activityType: true } }),
    prisma.issue.findMany({ where: { reporterId: { not: null }, updatedAt: inDay }, select: { reporterId: true } }),
    prisma.deliveryRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true } }),
    prisma.installationRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true } }),
    prisma.handoverRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true } }),
    prisma.invoiceRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ])

  const nameOf = new Map(users.map((u) => [u.id, u.name]))

  type Acc = {
    jobs: number; serials: number; qc: number; issues: number
    delivery: number; install: number; handover: number; invoice: number
    act: Partial<Record<ActivityType, number>>
  }
  const map = new Map<string, Acc>()
  const acc = (id: string): Acc => {
    let a = map.get(id)
    if (!a) { a = { jobs: 0, serials: 0, qc: 0, issues: 0, delivery: 0, install: 0, handover: 0, invoice: 0, act: {} }; map.set(id, a) }
    return a
  }

  for (const j of jobsCreated) if (j.createdById) acc(j.createdById).jobs++
  for (const r of serialRecs) if (r.staffId) acc(r.staffId).serials++
  for (const q of unitQcs) if (q.staffId) acc(q.staffId).qc++
  for (const i of issues) if (i.reporterId) acc(i.reporterId).issues++
  for (const d of deliveries) if (d.recordedById) acc(d.recordedById).delivery++
  for (const it of installs) if (it.recordedById) acc(it.recordedById).install++
  for (const h of handovers) if (h.recordedById) acc(h.recordedById).handover++
  for (const v of invoices) if (v.recordedById) acc(v.recordedById).invoice++
  for (const a of activities) {
    if (!a.responsibleUserId) continue
    const x = acc(a.responsibleUserId).act
    x[a.activityType] = (x[a.activityType] ?? 0) + 1
  }

  const result: StaffSummary[] = []
  for (const [id, a] of map) {
    const lines: SummaryLine[] = []
    if (a.jobs) lines.push({ cat: 'บันทึกงานใหม่', text: `บันทึกงานใหม่ ${a.jobs} รายการ` })
    if (a.serials) lines.push({ cat: 'ลง Serial', text: `ลง/ออกเลข Serial ${a.serials} งาน` })
    if (a.qc) lines.push({ cat: 'ตรวจ QC', text: `ตรวจสอบ QC (Checklist) ${a.qc} เครื่อง` })
    if (a.delivery) lines.push({ cat: 'จัดส่ง', text: `บันทึกงานจัดส่ง ${a.delivery} งาน` })
    if (a.install) lines.push({ cat: 'ติดตั้ง', text: `บันทึกงานติดตั้ง ${a.install} งาน` })
    if (a.handover) lines.push({ cat: 'ส่งมอบ', text: `บันทึกงานส่งมอบ ${a.handover} งาน` })
    if (a.invoice) lines.push({ cat: 'บิล', text: `บันทึกงานบิล/บริจาค ${a.invoice} งาน` })
    for (const [type, n] of Object.entries(a.act)) {
      const label = ACTIVITY_LABEL[type as ActivityType]
      lines.push({ cat: label, text: `${label} ${n} รายการ` })
    }
    if (a.issues) lines.push({ cat: 'แจ้งปัญหา', text: `จัดการแจ้งปัญหา ${a.issues} รายการ` })
    const total = a.jobs + a.serials + a.qc + a.issues + a.delivery + a.install + a.handover + a.invoice
      + Object.values(a.act).reduce((s, n) => s + (n ?? 0), 0)
    result.push({ staffId: id, name: nameOf.get(id) ?? '—', total, lines })
  }
  result.sort((x, y) => y.total - x.total)
  return result
}
