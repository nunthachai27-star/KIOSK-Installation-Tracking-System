import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── GET: รายชื่อผู้สนใจ (เจ้าหน้าที่เท่านั้น) ──────────────────────────────────
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const rows = await prisma.kioskLead.findMany({
    orderBy: { createdAt: 'desc' }, take: 500,
    select: { id: true, productName: true, hospital: true, contact: true, phone: true, email: true, note: true, createdAt: true },
  })
  return NextResponse.json(
    { leads: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), total: rows.length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
