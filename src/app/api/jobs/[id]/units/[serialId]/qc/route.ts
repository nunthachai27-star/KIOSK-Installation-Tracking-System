import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QcStatus } from '@prisma/client'

const VALID = new Set<string>(Object.values(QcStatus))

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; serialId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, serialId } = await params
  const body = (await req.json()) as { staffId?: string | null; status?: string; checklist?: unknown; keyId?: string | null }
  const status = body.status && VALID.has(body.status) ? (body.status as QcStatus) : 'PENDING'
  const staffId = body.staffId || null
  const keyId = body.keyId?.trim() || null

  // The unit must be a BMS-serial row belonging to this job.
  const unit = await prisma.serialNumber.findFirst({
    where: { id: serialId, jobId: id, serialType: 'BMS' },
    select: { id: true },
  })
  if (!unit) return NextResponse.json({ error: 'unit not found' }, { status: 404 })

  const saved = await prisma.unitQc.upsert({
    where: { serialId },
    create: { serialId, staffId, status, checklist: body.checklist ?? [], keyId },
    update: { staffId, status, checklist: body.checklist ?? [], keyId },
  })

  // Roll the per-unit results up to the job's QC status.
  const units = await prisma.serialNumber.findMany({
    where: { jobId: id, serialType: 'BMS' },
    select: { unitQc: { select: { status: true } } },
  })
  const total = units.length
  const passed = units.filter((u) => u.unitQc?.status === 'PASSED').length
  const anyFailed = units.some((u) => u.unitQc?.status === 'FAILED')
  const rollup: QcStatus = anyFailed ? 'FAILED' : total > 0 && passed === total ? 'PASSED' : 'PENDING'

  await prisma.qcRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, status: rollup, checklist: [] },
    update: { status: rollup },
  })
  // Advance the job stage: all-passed → พร้อมจัดส่ง; otherwise mark it in QC.
  const job = await prisma.job.findUnique({ where: { id }, select: { currentStatus: true } })
  if (job) {
    const early = job.currentStatus === 'DATA_ENTRY' || job.currentStatus === 'PREPARING' || job.currentStatus === 'QC'
    if (rollup === 'PASSED' && early) {
      await prisma.job.update({ where: { id }, data: { currentStatus: 'READY_TO_SHIP' } })
    } else if (rollup !== 'PASSED' && (job.currentStatus === 'DATA_ENTRY' || job.currentStatus === 'PREPARING')) {
      await prisma.job.update({ where: { id }, data: { currentStatus: 'QC' } })
    }
  }

  return NextResponse.json({ ...saved, rollup, passed, total })
}
