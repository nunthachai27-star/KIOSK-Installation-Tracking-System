import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Edit a staff member's nickname (ชื่อเล่น) — shown in the daily work report.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const data: { nickname?: string | null } = {}
  if (body.nickname !== undefined) data.nickname = typeof body.nickname === 'string' && body.nickname.trim() ? body.nickname.trim() : null
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.user.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: updated.id, nickname: updated.nickname })
}
