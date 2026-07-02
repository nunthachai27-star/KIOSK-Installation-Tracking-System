import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isActivityType } from '@/lib/activity'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { jobId, activityType, date, time, responsibleUserId } = await req.json()
  if (!jobId || !isActivityType(activityType) || !date) {
    return NextResponse.json({ error: 'jobId, activityType, date required' }, { status: 400 })
  }
  const activityDate = new Date(`${date}T${(time || '09:00')}:00`)
  if (isNaN(activityDate.getTime())) return NextResponse.json({ error: 'bad date/time' }, { status: 400 })

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 })

  const created = await prisma.jobActivity.create({
    data: { jobId, activityType, activityDate, responsibleUserId: responsibleUserId || null, status: 'SCHEDULED' },
  })
  return NextResponse.json(created, { status: 201 })
}
