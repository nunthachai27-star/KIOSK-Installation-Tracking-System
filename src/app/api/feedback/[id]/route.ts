import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// ทำเครื่องหมายว่าจัดการแล้ว/ยังไม่จัดการ (เจ้าหน้าที่)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const handled = !!b.handled
  const u = await prisma.feedback.update({
    where: { id },
    data: { handledAt: handled ? new Date() : null, handledBy: handled ? (session.user.name ?? null) : null },
    select: { id: true, handledAt: true },
  }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/คำแนะนำ', handled ? 'ทำเครื่องหมายจัดการแล้ว' : 'ยกเลิกจัดการแล้ว')
  return NextResponse.json({ ok: true, handledAt: u.handledAt })
}
