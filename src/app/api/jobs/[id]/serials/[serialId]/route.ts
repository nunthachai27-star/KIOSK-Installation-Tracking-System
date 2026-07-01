import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; serialId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, serialId } = await params
  const serial = await prisma.serialNumber.findUnique({ where: { id: serialId }, select: { jobId: true } })
  if (!serial || serial.jobId !== id) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.serialNumber.delete({ where: { id: serialId } })
  return NextResponse.json({ ok: true })
}
