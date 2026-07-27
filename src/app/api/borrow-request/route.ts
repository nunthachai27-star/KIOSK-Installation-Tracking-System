import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const RATE_MAX = 5              // สูงสุดต่อ IP ต่อชั่วโมง
const RATE_WINDOW_MS = 3600_000 // 1 ชั่วโมง

// Public (no login): a borrower submits a draft borrow request via the QR/link.
// They provide only their own details — staff pick the actual item and approve.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  // Honeypot: a hidden field real users never see. Bots tend to fill every input,
  // so if it has any value we pretend success but silently drop the request.
  if (str(b.website, 200)) return NextResponse.json({ ok: true }, { status: 201 })

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

  // Submitter IP: prefer proxy-set x-real-ip; the leftmost x-forwarded-for is
  // client-spoofable, so fall back to its LAST (proxy-appended) entry.
  const xff = req.headers.get('x-forwarded-for')
  const ip = (req.headers.get('x-real-ip') || xff?.split(',').pop() || '').trim() || null

  // Rate limit: cap requests per IP per hour to blunt spam/flooding.
  if (ip) {
    const recent = await prisma.loanRequest.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    })
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'rate limited', message: 'ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง' }, { status: 429 })
    }
  }

  const created = await prisma.loanRequest.create({
    data: { borrowerName, borrowerPhone, borrowerOrg, purpose, dueDate, ip },
    select: { id: true },
  })
  return NextResponse.json({ id: created.id, ok: true }, { status: 201 })
}
