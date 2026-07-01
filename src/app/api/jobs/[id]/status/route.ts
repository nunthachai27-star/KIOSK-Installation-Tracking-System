import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidStatus } from '@/lib/transition'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  // Any authenticated user may update status — FIELD reports progress from the field.
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const status = body?.status

  if (typeof status !== 'string' || !isValidStatus(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const existing = await prisma.job.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const job = await prisma.job.update({ where: { id }, data: { currentStatus: status } })
  return NextResponse.json(job)
}
