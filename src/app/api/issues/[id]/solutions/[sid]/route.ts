import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Remove one resolution-timeline entry.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id, sid } = await params
  const row = await prisma.issueSolution.findFirst({ where: { id: sid, issueId: id }, select: { id: true, text: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.issueSolution.delete({ where: { id: row.id } })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/เคลม', `ลบวิธีแก้ไข "${row.text.slice(0, 40)}"`)
  return NextResponse.json({ ok: true })
}
