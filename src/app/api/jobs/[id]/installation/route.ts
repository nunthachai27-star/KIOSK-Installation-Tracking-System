import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InstallType, InstallStatus, ActivityType } from '@prisma/client'

const installationInput = z.object({
  installType: z.enum(InstallType).optional(),
  remoteDate: z.coerce.date().optional().nullable(),
  onsiteDate: z.coerce.date().optional().nullable(),
  result: z.string().optional().nullable(),
  problem: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  status: z.enum(InstallStatus).optional(),
})

async function upsertActivity(jobId: string, activityType: ActivityType, activityDate: Date) {
  const existing = await prisma.jobActivity.findFirst({ where: { jobId, activityType } })
  if (existing) {
    await prisma.jobActivity.update({ where: { id: existing.id }, data: { activityDate } })
  } else {
    await prisma.jobActivity.create({ data: { jobId, activityType, activityDate } })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const parsed = installationInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const installation = await prisma.installationRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, ...data },
    update: data,
  })

  if (data.status === 'INSTALLING') {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'INSTALLING' } })
  }

  if (data.remoteDate) {
    await upsertActivity(id, 'REMOTE', data.remoteDate)
  }
  if (data.onsiteDate) {
    await upsertActivity(id, 'ONSITE', data.onsiteDate)
  }

  return NextResponse.json(installation)
}
