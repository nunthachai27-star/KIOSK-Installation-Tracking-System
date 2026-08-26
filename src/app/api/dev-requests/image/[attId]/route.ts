import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { serveDevImage } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── GET: เสิร์ฟรูปให้เจ้าหน้าที่ (ต้องล็อกอิน OFFICE) ─────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ attId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { attId } = await params
  return serveDevImage(attId)
}

// ── DELETE: ลบรูปแนบ (เจ้าหน้าที่) ───────────────────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ attId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { attId } = await params
  const att = await prisma.attachment.findUnique({ where: { id: attId }, select: { id: true, refTable: true } })
  if (!att || att.refTable !== 'DevRequest') return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.attachment.delete({ where: { id: attId } })
  await logAction(session.user, 'DELETE', 'คำขอพัฒนา', 'ลบรูปแนบ')
  return NextResponse.json({ ok: true, id: attId })
}
