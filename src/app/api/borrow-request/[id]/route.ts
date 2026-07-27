import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Staff: reject a pending borrow request. (Approval happens via POST /api/loans
// with a requestId, which creates the loan and marks the request APPROVED.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const b = await req.json().catch(() => ({}))
  const reqRow = await prisma.loanRequest.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!reqRow) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (reqRow.status !== 'PENDING') {
    return NextResponse.json({ error: 'not pending', message: 'คำขอนี้ถูกดำเนินการไปแล้ว' }, { status: 409 })
  }

  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : ''
  await prisma.loanRequest.update({ where: { id }, data: { status: 'REJECTED', note: note || null } })
  await logAction(session.user, 'UPDATE', 'ยืม-คืน', 'ปฏิเสธคำขอยืม')
  return NextResponse.json({ id, status: 'REJECTED' })
}

// Staff: delete a request row (any non-pending, e.g. clean up rejected/approved).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.loanRequest.delete({ where: { id } }).catch(() => null)
  await logAction(session.user, 'DELETE', 'ยืม-คืน', 'ลบคำขอยืม')
  return NextResponse.json({ ok: true })
}
