import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QcStatus } from '@prisma/client'

const VALID_STATUSES = new Set<string>(Object.values(QcStatus))

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await req.json()) as { status?: string; checklist?: unknown; remark?: string }
  const { status, checklist, remark } = body

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const qc = await prisma.qcRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, status: status as QcStatus, checklist: checklist ?? [], remark },
    update: { status: status as QcStatus, checklist: checklist ?? [], remark },
  })

  if (status === 'PASSED') {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'READY_TO_SHIP' } })
  }

  return NextResponse.json(qc)
}
