import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jobInput } from '@/lib/jobSchema'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  // Combine filters with AND so the role-scope OR and the search OR don't collide.
  const and: Prisma.JobWhereInput[] = []
  // FIELD users only see jobs they own or are assigned an activity on; OFFICE sees all.
  if (session.user.role !== 'OFFICE') {
    and.push({
      OR: [
        { installerOwnerId: session.user.id },
        { activities: { some: { responsibleUserId: session.user.id } } },
      ],
    })
  }
  if (status) and.push({ currentStatus: status as never })
  if (q) and.push({ OR: [{ jobCode: { contains: q } }, { hospital: { name: { contains: q } } }] })

  const jobs = await prisma.job.findMany({
    where: and.length ? { AND: and } : {},
    include: { hospital: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = jobInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const job = await prisma.job.create({ data: { ...parsed.data, createdById: session.user.id ?? null } })
  return NextResponse.json(job, { status: 201 })
}
