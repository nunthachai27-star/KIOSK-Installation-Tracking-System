import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Lend one stock unit out. Borrower name + phone are mandatory — an item must
// never leave the shelf anonymously — and only units actually sitting in stock
// can be lent, so a unit cannot be double-booked or lent after being issued.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const itemId = str(body.itemId)
  const borrowerName = str(body.borrowerName)
  const borrowerPhone = str(body.borrowerPhone)
  const dueDate = str(body.dueDate)

  if (!itemId) return NextResponse.json({ error: 'item required', message: 'เลือกอุปกรณ์ที่จะยืม' }, { status: 400 })
  if (!borrowerName) return NextResponse.json({ error: 'name required', message: 'กรอกชื่อผู้ยืม' }, { status: 400 })
  if (!borrowerPhone) return NextResponse.json({ error: 'phone required', message: 'กรอกเบอร์โทรผู้ยืม' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: 'due required', message: 'ระบุกำหนดวันคืน' }, { status: 400 })
  }

  // Digits only (allow spaces/dashes as typed) — 9–10 for Thai landline/mobile.
  const digits = borrowerPhone.replace(/[\s-]/g, '')
  if (!/^\d{9,10}$/.test(digits)) {
    return NextResponse.json({ error: 'phone invalid', message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' }, { status: 400 })
  }

  const item = await prisma.stockItem.findUnique({ where: { id: itemId }, select: { id: true, status: true } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (item.status !== 'IN_STOCK') {
    const why = item.status === 'BORROWED' ? 'อุปกรณ์นี้ถูกยืมไปแล้ว' : 'อุปกรณ์นี้จ่ายออกไปแล้ว ยืมไม่ได้'
    return NextResponse.json({ error: 'unavailable', message: why }, { status: 409 })
  }

  // Flip the unit and open the loan together so stock can never show a unit as
  // available while an open loan exists for it (or the reverse).
  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        itemId: item.id,
        borrowerName,
        borrowerPhone,
        borrowerOrg: str(body.borrowerOrg) || null,
        purpose: str(body.purpose) || null,
        dueDate: new Date(`${dueDate}T00:00:00Z`),
        recordedById: session.user?.id ?? null,
      },
    })
    await tx.stockItem.update({ where: { id: item.id }, data: { status: 'BORROWED' } })
    return created
  })

  await logAction(session.user, 'CREATE', 'ยืม-คืน', `ยืมของให้ ${borrowerName}`)
  return NextResponse.json({ id: loan.id }, { status: 201 })
}
