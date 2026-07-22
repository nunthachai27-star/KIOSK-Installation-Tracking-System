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
