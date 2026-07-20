import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json()
  if (typeof b.title !== 'string' || !b.title.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const start = b.startDate ? new Date(b.startDate) : null
  if (!start || isNaN(start.getTime())) return NextResponse.json({ error: 'startDate required' }, { status: 400 })
  const end = b.endDate ? new Date(b.endDate) : null

  const created = await prisma.task.create({
    data: {
      title: b.title.trim(),
      kind: typeof b.kind === 'string' && b.kind.trim() ? b.kind.trim() : 'อื่นๆ',
      hospitalName: typeof b.hospitalName === 'string' && b.hospitalName.trim() ? b.hospitalName.trim() : null,
      responsibleUserId: typeof b.responsibleUserId === 'string' && b.responsibleUserId ? b.responsibleUserId : null,
      startDate: start,
      endDate: end && !isNaN(end.getTime()) ? end : null,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
