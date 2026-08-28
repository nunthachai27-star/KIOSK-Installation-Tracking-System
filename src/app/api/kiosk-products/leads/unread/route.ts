import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── GET: จำนวนผู้สนใจที่ยังไม่ได้ดู + รายล่าสุด (ไม่ mark ว่าดูแล้ว) — สำหรับ poll ────
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const [count, latest] = await Promise.all([
    prisma.kioskLead.count({ where: { seenAt: null } }),
    prisma.kioskLead.findFirst({ where: { seenAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, hospital: true, productName: true } }),
  ])
  return NextResponse.json({ count, latest }, { headers: { 'Cache-Control': 'no-store' } })
}
