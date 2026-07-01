import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jobInput } from '@/lib/jobSchema'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')
  const jobs = await prisma.job.findMany({
    where: {
      ...(status ? { currentStatus: status as never } : {}),
      ...(q ? { OR: [{ jobCode: { contains: q } }, { hospital: { name: { contains: q } } }] } : {}),
    },
    include: { hospital: true }, orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = jobInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const job = await prisma.job.create({ data: parsed.data })
  return NextResponse.json(job, { status: 201 })
}
