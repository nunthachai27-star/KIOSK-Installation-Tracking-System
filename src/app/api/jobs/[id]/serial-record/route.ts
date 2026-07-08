import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SerialStatus } from '@prisma/client'
import { addBusinessDays } from '@/lib/workdays'

const VALID = new Set<string>(Object.values(SerialStatus))

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await req.json()) as { staffId?: string | null; status?: string }
  const status = body.status && VALID.has(body.status) ? (body.status as SerialStatus) : 'PENDING'
  const staffId = body.staffId || null

  const job = await prisma.job.findUnique({ where: { id }, select: { currentStatus: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // "ลงครบแล้ว" schedules QC 3 business days out (skip Sat/Sun). Compute once on
  // the transition to DONE; keep the existing plan on subsequent saves.
  const existing = await prisma.serialRecord.findUnique({ where: { jobId: id }, select: { status: true, qcPlannedDate: true } })
  let qcPlannedDate: Date | null = null
  if (status === 'DONE') {
    qcPlannedDate = existing?.status === 'DONE' && existing.qcPlannedDate ? existing.qcPlannedDate : addBusinessDays(new Date(), 3)
  }

  const saved = await prisma.serialRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, staffId, status, qcPlannedDate },
    update: { staffId, status, qcPlannedDate },
  })

  // Advance the workflow stage from the serial step:
  //  • "ลงครบแล้ว" (DONE) → the units are ready for QC (ตรวจสอบ QC).
  //  • still in progress → a brand-new job moves to "เตรียมสินค้า".
  if (status === 'DONE') {
    if (job.currentStatus === 'DATA_ENTRY' || job.currentStatus === 'PREPARING') {
      await prisma.job.update({ where: { id }, data: { currentStatus: 'QC' } })
    }
  } else if (status !== 'PENDING' && job.currentStatus === 'DATA_ENTRY') {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'PREPARING' } })
  }
  return NextResponse.json(saved)
}
