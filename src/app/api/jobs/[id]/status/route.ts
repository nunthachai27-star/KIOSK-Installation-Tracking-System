import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidStatus } from '@/lib/transition'
import { fieldCanAccessJob } from '@/lib/access'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const status = body?.status

  if (typeof status !== 'string' || !isValidStatus(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const existing = await prisma.job.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // OFFICE may update any job; FIELD only jobs they are assigned to.
  // NOTE: any valid status is accepted here by design for this LITE MVP — a
  // strict currentStatus->status transition state machine is a TLS-phase item.
  if (session.user.role !== 'OFFICE' && !(await fieldCanAccessJob(id, session.user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const job = await prisma.job.update({ where: { id }, data: { currentStatus: status } })
  return NextResponse.json(job)
}
