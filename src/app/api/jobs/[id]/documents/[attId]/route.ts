import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ── DELETE: ลบเอกสารงาน (ต้องเป็นเอกสารของงานนี้) ─────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, attId } = await params
  const att = await prisma.attachment.findUnique({ where: { id: attId }, select: { id: true, refTable: true, refId: true, fileName: true } })
  if (!att || att.refTable !== 'JobDoc' || att.refId !== id) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.attachment.delete({ where: { id: attId } })
  await logAction(session.user, 'DELETE', 'เอกสารงาน', `ลบ ${att.fileName}`)
  return NextResponse.json({ ok: true, id: attId })
}
