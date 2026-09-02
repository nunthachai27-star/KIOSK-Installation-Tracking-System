import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// PATCH: เปลี่ยนเลข S/N BMS ของเครื่อง (serialType=BMS) + ไล่อัปเดตที่ map ไว้ส่วนอื่น
// (StockItem.serialBMS ของอุปกรณ์ที่ตัดออกให้เครื่องนี้ และ Issue.machineSerial ที่ผูกกับเครื่องนี้)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; serialId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, serialId } = await params
  const serial = await prisma.serialNumber.findUnique({ where: { id: serialId }, select: { jobId: true, serialNo: true, serialType: true } })
  if (!serial || serial.jobId !== id) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (serial.serialType !== 'BMS') return NextResponse.json({ error: 'not_bms', message: 'แก้ได้เฉพาะเลข S/N BMS ของเครื่อง' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const next = String(body?.serialNo ?? '').replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!next) return NextResponse.json({ error: 'empty', message: 'ระบุเลข S/N BMS' }, { status: 400 })
  const old = serial.serialNo
  if (next === old) return NextResponse.json({ ok: true, serialNo: next, stockUpdated: 0, unchanged: true })

  // กันซ้ำกับเครื่อง BMS อื่นในงานเดียวกัน
  const dup = await prisma.serialNumber.count({ where: { jobId: id, serialType: 'BMS', serialNo: next, id: { not: serialId } } })
  if (dup > 0) return NextResponse.json({ error: 'duplicate', message: `เลข "${next}" ซ้ำกับเครื่องอื่นในงานนี้` }, { status: 409 })

  const [, stockRes, issueRes] = await prisma.$transaction([
    prisma.serialNumber.update({ where: { id: serialId }, data: { serialNo: next } }),
    prisma.stockItem.updateMany({ where: { jobId: id, serialBMS: { equals: old, mode: 'insensitive' } }, data: { serialBMS: next } }),
    prisma.issue.updateMany({ where: { serialId, machineSerial: { equals: old, mode: 'insensitive' } }, data: { machineSerial: next } }),
  ])

  await logAction(session.user, 'UPDATE', 'ลง Serial', `เปลี่ยน S/N BMS ${old} → ${next} (คลัง ${stockRes.count} · เคลม ${issueRes.count})`)
  return NextResponse.json({ ok: true, serialNo: next, stockUpdated: stockRes.count, issueUpdated: issueRes.count })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; serialId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, serialId } = await params
  const serial = await prisma.serialNumber.findUnique({ where: { id: serialId }, select: { jobId: true, serialNo: true } })
  if (!serial || serial.jobId !== id) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.serialNumber.delete({ where: { id: serialId } })

  // If this serial came from stock (issued to this job), return it to the warehouse.
  // Match case-insensitively — component serials are stored upper-cased.
  if (serial.serialNo) {
    await prisma.stockItem.updateMany({
      where: { serialNo: { equals: serial.serialNo, mode: 'insensitive' }, jobId: id, status: 'ISSUED' },
      data: { status: 'IN_STOCK', jobId: null, hospitalId: null, issuedDate: null, serialBMS: null },
    })
  }
  return NextResponse.json({ ok: true })
}
