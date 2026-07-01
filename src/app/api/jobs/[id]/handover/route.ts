import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HandoverStatus } from '@prisma/client'

const handoverInput = z.object({
  checklistStatus: z.enum(HandoverStatus).optional(),
  checklistReceivedDate: z.coerce.date().optional().nullable(),
  handoverStatus: z.enum(HandoverStatus).optional(),
  handoverDate: z.coerce.date().optional().nullable(),
  remark: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const parsed = handoverInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const handover = await prisma.handoverRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, ...data },
    update: data,
  })

  if (data.handoverStatus === 'DELIVERED') {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'WAIT_INVOICE' } })
  }

  return NextResponse.json(handover)
}
