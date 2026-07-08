import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client'
import { PROGRESS_RANK } from '@/lib/status'

const deliveryInput = z.object({
  shippedDate: z.coerce.date().optional().nullable(),
  arrivedDate: z.coerce.date().optional().nullable(),
  method: z.string().optional().nullable(),
  vehicle: z.string().optional().nullable(),
  trackingNo: z.string().optional().nullable(),
  estimatedCost: z.coerce.number().optional().nullable(),
  actualCost: z.coerce.number().optional().nullable(),
  status: z.enum(DeliveryStatus).optional(),
  remark: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true, currentStatus: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const parsed = deliveryInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = { ...parsed.data, recordedById: session.user.id }

  const delivery = await prisma.deliveryRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, ...data },
    update: data,
  })

  // Recording the delivery advances the job into the installation phase (ขั้นตอน 5),
  // unless it has already progressed past it.
  if (PROGRESS_RANK[job.currentStatus] < PROGRESS_RANK.INSTALLING) {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'INSTALLING' } })
  }

  return NextResponse.json(delivery)
}
