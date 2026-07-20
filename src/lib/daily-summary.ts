import type { ActivityType, Role } from '@prisma/client'
import { prisma } from './prisma'
import { ACTIVITY_LABEL } from './activity'

export type SummaryLine = { heading: string; text: string; items: string[] }
export type IssueDetail = { hospital: string; product: string; problem: string; solution: string }
export type StaffSummary = {
  staffId: string; name: string; nickname: string | null; role: Role
  total: number; issueDetails: IssueDetail[]; lines: SummaryLine[]; rating: number; ratingCount: number
}

// Per-staff work summary for a day — each category lists the actual items worked on,
// plus a detailed problem-fixing section (แจ้งปัญหา / การดำเนินการ) for general issues.
export async function getDailySummary(from: Date, to: Date): Promise<StaffSummary[]> {
  const inDay = { gte: from, lte: to }
  const jobSel = { hospital: { select: { name: true } }, productType: true, jobCode: true } as const
  const [jobsCreated, serialRecs, unitQcs, activities, issues, deliveries, installs, handovers, invoices, users] = await Promise.all([
    prisma.job.findMany({ where: { createdById: { not: null }, createdAt: inDay }, select: { createdById: true, hospital: { select: { name: true } }, productType: true, jobCode: true } }),
    prisma.serialRecord.findMany({ where: { staffId: { not: null }, updatedAt: inDay }, select: { staffId: true, job: { select: jobSel } } }),
    prisma.unitQc.findMany({ where: { updatedAt: inDay }, select: { staffId: true, checklist: true, serial: { select: { serialNo: true, job: { select: { hospital: { select: { name: true } }, productType: true } } } } } }),
    prisma.jobActivity.findMany({ where: { responsibleUserId: { not: null }, activityDate: inDay }, select: { responsibleUserId: true, activityType: true, job: { select: { hospital: { select: { name: true } }, productType: true } } } }),
    prisma.issue.findMany({ where: { updatedAt: inDay }, select: { assignedToId: true, reporterId: true, issueType: true, title: true, solution: true, productType: true, machineSerial: true, hospitalName: true, serial: { select: { serialNo: true } }, job: { select: { productType: true, hospital: { select: { name: true } } } } } }),
    prisma.deliveryRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true, job: { select: jobSel } } }),
    prisma.installationRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true, job: { select: jobSel } } }),
    prisma.handoverRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true, job: { select: jobSel } } }),
    prisma.invoiceRecord.findMany({ where: { recordedById: { not: null }, updatedAt: inDay }, select: { recordedById: true, job: { select: jobSel } } }),
    prisma.user.findMany({ select: { id: true, name: true, nickname: true, role: true } }),
  ])
  // Cumulative satisfaction per resolver (all-time) — badge alongside the daily report.
  const ratingByStaff = await prisma.issue.groupBy({ by: ['assignedToId'], where: { rating: { not: null }, assignedToId: { not: null } }, _avg: { rating: true }, _count: { rating: true } })
  const ratingOf = new Map(ratingByStaff.map((g) => [g.assignedToId as string, { avg: g._avg.rating ?? 0, count: g._count.rating }]))

  const userOf = new Map(users.map((u) => [u.id, u]))
  const nameToId = new Map(users.map((u) => [u.name.trim(), u.id]))
  const jobDesc = (j: { hospital: { name: string }; productType: string; jobCode: string }) => `${j.hospital.name} · ${j.productType} (${j.jobCode})`
  const fromMs = from.getTime(), toMs = to.getTime()

  type Acc = {
    jobs: string[]; serials: string[]; qc: string[]; issueDetails: IssueDetail[]; claims: string[]
    delivery: string[]; install: string[]; handover: string[]; invoice: string[]
    act: Partial<Record<ActivityType, string[]>>
  }
  const map = new Map<string, Acc>()
  const acc = (id: string): Acc => {
    let a = map.get(id)
    if (!a) { a = { jobs: [], serials: [], qc: [], issueDetails: [], claims: [], delivery: [], install: [], handover: [], invoice: [], act: {} }; map.set(id, a) }
    return a
  }

  for (const j of jobsCreated) if (j.createdById) acc(j.createdById).jobs.push(jobDesc(j))
  for (const r of serialRecs) if (r.staffId) acc(r.staffId).serials.push(jobDesc(r.job))
  // QC: attribute each checklist item to the person who actually checked it (by name),
  // only counting items marked within this day.
  for (const q of unitQcs) {
    if (!q.serial) continue
    const list = Array.isArray(q.checklist) ? (q.checklist as unknown[]) : []
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const e = raw as { item?: unknown; result?: unknown; by?: unknown; at?: unknown }
      if (e.result !== 'pass' && e.result !== 'fail') continue
      if (typeof e.at !== 'string') continue
      const atMs = new Date(e.at).getTime()
      if (isNaN(atMs) || atMs < fromMs || atMs > toMs) continue
      const actor = (typeof e.by === 'string' && nameToId.get(e.by.trim())) || q.staffId
      if (!actor) continue
      acc(actor).qc.push(`${q.serial.serialNo} · ${typeof e.item === 'string' ? e.item : '—'} · ${q.serial.job.hospital.name}`)
    }
  }
  for (const i of issues) {
    // Attribute problem-solving to the resolver (assignedTo), else the reporter.
    const actor = i.assignedToId ?? i.reporterId
    if (!actor) continue
    const hospital = i.job?.hospital.name ?? i.hospitalName ?? '—'
    const product = i.job?.productType ?? i.productType ?? ''
    if (i.issueType === 'GENERAL') {
      acc(actor).issueDetails.push({ hospital, product, problem: i.title, solution: (i.solution ?? '').trim() })
    } else {
      acc(actor).claims.push(`${i.serial?.serialNo ?? i.machineSerial ?? '—'} · ${hospital} · ${i.title}`)
    }
  }
  for (const d of deliveries) if (d.recordedById) acc(d.recordedById).delivery.push(jobDesc(d.job))
  for (const it of installs) if (it.recordedById) acc(it.recordedById).install.push(jobDesc(it.job))
  for (const h of handovers) if (h.recordedById) acc(h.recordedById).handover.push(jobDesc(h.job))
  for (const v of invoices) if (v.recordedById) acc(v.recordedById).invoice.push(jobDesc(v.job))
  for (const a of activities) {
    if (!a.responsibleUserId) continue
    const x = acc(a.responsibleUserId).act
    ;(x[a.activityType] ??= []).push(`${a.job.hospital.name} · ${a.job.productType}`)
  }

  const result: StaffSummary[] = []
  for (const [id, a] of map) {
    const lines: SummaryLine[] = []
    if (a.jobs.length) lines.push({ heading: 'งานบันทึกข้อมูลงานใหม่เข้าสู่ระบบ', text: `ดำเนินการบันทึกข้อมูลงานใหม่เข้าสู่ระบบ จำนวน ${a.jobs.length} รายการ พร้อมรายละเอียดที่เกี่ยวข้องเรียบร้อยแล้ว`, items: a.jobs })
    if (a.serials.length) lines.push({ heading: 'งานลงทะเบียนหมายเลขเครื่อง (Serial Number)', text: `ดำเนินการลงทะเบียนและออกหมายเลขเครื่อง (Serial Number) ของอุปกรณ์ จำนวน ${a.serials.length} งาน พร้อมบันทึกข้อมูลเรียบร้อยแล้ว`, items: a.serials })
    if (a.qc.length) lines.push({ heading: 'งานตรวจสอบคุณภาพอุปกรณ์ (QC Checklist)', text: `ดำเนินการตรวจสอบคุณภาพและความพร้อมของอุปกรณ์ตามรายการตรวจสอบ (Checklist) จำนวน ${a.qc.length} รายการ พร้อมบันทึกผลการตรวจสอบเรียบร้อยแล้ว`, items: a.qc })
    if (a.delivery.length) lines.push({ heading: 'งานจัดส่งสินค้าและอุปกรณ์', text: `ดำเนินการจัดส่งสินค้าและอุปกรณ์ตามแผนงาน จำนวน ${a.delivery.length} งาน พร้อมบันทึกรายละเอียดการจัดส่งและหลักฐานประกอบเรียบร้อยแล้ว`, items: a.delivery })
    if (a.install.length) lines.push({ heading: 'งานติดตั้งระบบและอุปกรณ์', text: `ดำเนินการติดตั้งระบบและอุปกรณ์ให้แก่หน่วยงานหรือสถานที่ที่ได้รับมอบหมาย จำนวน ${a.install.length} งาน พร้อมบันทึกรายละเอียดการติดตั้งและผลการดำเนินงานเรียบร้อยแล้ว`, items: a.install })
    if (a.handover.length) lines.push({ heading: 'งานส่งมอบงานและอบรมการใช้งาน', text: `ดำเนินการส่งมอบงานและอบรมการใช้งานให้แก่หน่วยงานที่เกี่ยวข้อง จำนวน ${a.handover.length} งาน พร้อมบันทึกรายละเอียดการส่งมอบเรียบร้อยแล้ว`, items: a.handover })
    if (a.invoice.length) lines.push({ heading: 'งานจัดทำเอกสารใบแจ้งหนี้/ใบเสร็จ', text: `ดำเนินการจัดทำและบันทึกเอกสารใบแจ้งหนี้/ใบเสร็จ จำนวน ${a.invoice.length} งาน เรียบร้อยแล้ว`, items: a.invoice })
    if (a.claims.length) lines.push({ heading: 'งานรับแจ้ง/เคลมสินค้า', text: `ดำเนินการรับแจ้งและจัดการเคลมสินค้า จำนวน ${a.claims.length} รายการ พร้อมบันทึกรายละเอียดและติดตามผลเรียบร้อยแล้ว`, items: a.claims })
    for (const [type, list] of Object.entries(a.act)) {
      if (!list || !list.length) continue
      const label = ACTIVITY_LABEL[type as ActivityType] ?? 'งานอื่นๆ'
      lines.push({ heading: `งาน${label} (ตามแผนคิว)`, text: `ดำเนินการ${label}ตามแผนงานที่ได้รับมอบหมาย จำนวน ${list.length} รายการ เรียบร้อยแล้ว`, items: list })
    }
    const total = a.issueDetails.length + lines.reduce((s, l) => s + l.items.length, 0)
    const u = userOf.get(id)
    const r = ratingOf.get(id)
    result.push({ staffId: id, name: u?.name ?? '—', nickname: u?.nickname ?? null, role: u?.role ?? 'OFFICE', total, issueDetails: a.issueDetails, lines, rating: r?.avg ?? 0, ratingCount: r?.count ?? 0 })
  }
  result.sort((x, y) => y.total - x.total)
  return result
}
