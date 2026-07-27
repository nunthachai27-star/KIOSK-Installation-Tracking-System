import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Take a lent unit back: closes the loan and returns the unit to stock.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const loan = await prisma.loan.findUnique({ where: { id }, select: { id: true, itemId: true, status: true } })
  if (!loan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (loan.status === 'RETURNED') {
    return NextResponse.json({ error: 'already returned', message: 'รายการนี้รับคืนไปแล้ว' }, { status: 409 })
  }

  const note = typeof body.returnNote === 'string' ? body.returnNote.trim() : ''

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: { status: 'RETURNED', returnedAt: new Date(), returnNote: note || null },
    })
    // Only pull the unit back into stock if the loan still owns it; if it was
    // issued out meanwhile, leave that status alone.
    await tx.stockItem.updateMany({ where: { id: loan.itemId, status: 'BORROWED' }, data: { status: 'IN_STOCK' } })
  })

  await logAction(session.user, 'UPDATE', 'ยืม-คืน', 'รับคืนอุปกรณ์')
  return NextResponse.json({ id: loan.id, status: 'RETURNED' })
}

// Delete a loan record — only once the unit has been returned, so an open loan
// can never be erased while the item is still out. The unit is left untouched
// (it is already back IN_STOCK after the return).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const loan = await prisma.loan.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!loan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (loan.status !== 'RETURNED') {
    return NextResponse.json({ error: 'not returned', message: 'ลบได้เฉพาะรายการที่รับคืนแล้ว' }, { status: 409 })
  }

  await prisma.loan.delete({ where: { id: loan.id } })
  await logAction(session.user, 'DELETE', 'ยืม-คืน', 'ลบรายการยืม-คืนที่คืนแล้ว')
  return NextResponse.json({ ok: true })
}
