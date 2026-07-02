import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ActivityStatus } from '@prisma/client'

const STATUSES: ActivityStatus[] = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'POSTPONED', 'PROBLEM']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const { status } = await req.json()
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 })
  const found = await prisma.jobActivity.findUnique({ where: { id }, select: { id: true } })
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const updated = await prisma.jobActivity.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const found = await prisma.jobActivity.findUnique({ where: { id }, select: { id: true } })
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.jobActivity.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
