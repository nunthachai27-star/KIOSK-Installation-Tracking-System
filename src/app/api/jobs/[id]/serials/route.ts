import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSerial, findDuplicateSerial } from '@/lib/serial'
import type { SerialType } from '@prisma/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await req.json()) as { serialType?: SerialType; serialNo?: string }
  const { serialType, serialNo } = body

  if (!serialType || !serialNo) {
    return NextResponse.json({ error: 'serialType and serialNo are required' }, { status: 400 })
  }

  // Ensure the target job exists before writing a child record.
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Duplicate = same serial already recorded on a DIFFERENT job (allow re-saving
  // within the same job, e.g. correcting an entry).
  if (await findDuplicateSerial(serialNo, id)) {
    return NextResponse.json({ error: 'duplicate serial' }, { status: 409 })
  }

  const created = await prisma.serialNumber.create({
    data: { jobId: id, serialType, serialNo: normalizeSerial(serialNo) },
  })

  return NextResponse.json(created, { status: 201 })
}
