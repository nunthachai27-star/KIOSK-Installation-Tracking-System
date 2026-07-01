import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCloseJob } from '@/lib/close'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    include: { handover: true, invoice: true },
  })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { ok, reasons } = canCloseJob(job)
  if (!ok) {
    return NextResponse.json({ error: 'ยังปิดงานไม่ได้', reasons }, { status: 400 })
  }

  const updated = await prisma.job.update({ where: { id }, data: { currentStatus: 'CLOSED' } })
  return NextResponse.json(updated)
}
