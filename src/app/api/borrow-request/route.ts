import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public (no login): a borrower submits a draft borrow request via the QR/link.
// They provide only their own details — staff pick the actual item and approve.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  const borrowerName = str(b.borrowerName, 120)
  const borrowerPhone = str(b.borrowerPhone, 30)
  const borrowerOrg = str(b.borrowerOrg, 160) || null
  const purpose = str(b.purpose, 500) || null
  const dueRaw = str(b.dueDate, 10)

  if (!borrowerName) return NextResponse.json({ error: 'name required', message: 'กรอกชื่อผู้ยืม' }, { status: 400 })
  const digits = borrowerPhone.replace(/[\s-]/g, '')
  if (!/^\d{9,10}$/.test(digits)) {
    return NextResponse.json({ error: 'phone invalid', message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' }, { status: 400 })
  }
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? new Date(`${dueRaw}T00:00:00Z`) : null

  const created = await prisma.loanRequest.create({
    data: { borrowerName, borrowerPhone, borrowerOrg, purpose, dueDate },
    select: { id: true },
  })
  return NextResponse.json({ id: created.id, ok: true }, { status: 201 })
}
