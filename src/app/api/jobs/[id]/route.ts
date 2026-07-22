import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { jobInput } from '@/lib/jobSchema'
import { fieldCanAccessJob } from '@/lib/access'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, include: { hospital: true, serials: true, qc: true, delivery: true, installation: true, handover: true, invoice: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // FIELD users may only read jobs assigned to them; hide others as 404.
  if (session.user.role !== 'OFFICE' && !(await fieldCanAccessJob(id, session.user.id))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json(job)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const parsed = jobInput.partial().safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const job = await prisma.job.update({ where: { id }, data: parsed.data })
  await logAction(session.user, 'UPDATE', 'งาน', `แก้ไขงาน ${job.jobCode}`)
  return NextResponse.json(job)
}
