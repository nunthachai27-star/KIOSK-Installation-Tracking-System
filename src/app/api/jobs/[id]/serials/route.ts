import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSerial, findDuplicateSerial } from '@/lib/serial'
import type { SerialType } from '@prisma/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await req.json()) as { serialType?: SerialType; serialNo?: string }
  const { serialType, serialNo } = body

  if (!serialType || !serialNo) {
    return NextResponse.json({ error: 'serialType and serialNo are required' }, { status: 400 })
  }

  if (await findDuplicateSerial(serialNo)) {
    return NextResponse.json({ error: 'duplicate serial' }, { status: 409 })
  }

  const created = await prisma.serialNumber.create({
    data: { jobId: id, serialType, serialNo: normalizeSerial(serialNo) },
  })

  return NextResponse.json(created, { status: 201 })
}
