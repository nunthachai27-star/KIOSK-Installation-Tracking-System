import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ลบไฟล์แนบของคู่มือ
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id, attId } = await params
  await prisma.attachment.deleteMany({ where: { id: attId, refTable: 'Manual', refId: id } })
  return NextResponse.json({ ok: true })
}
