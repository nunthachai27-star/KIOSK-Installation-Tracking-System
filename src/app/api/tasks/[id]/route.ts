import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ActivityStatus } from '@prisma/client'

const STATUSES = new Set<string>(Object.values(ActivityStatus))

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  const data: { status?: ActivityStatus } = {}
  if (typeof b.status === 'string' && STATUSES.has(b.status)) data.status = b.status as ActivityStatus

  const updated = await prisma.task.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.task.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
