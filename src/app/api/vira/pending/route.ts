import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VIRA_PENDING_WHERE } from '@/lib/vira-shared'

export const dynamic = 'force-dynamic'

// GET /api/vira/pending → จำนวนเรื่องจาก Vira ที่ยังไม่มีใครกดรับ (ให้ตัวแจ้งเตือนในเว็บ poll)
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE' && session?.user?.role !== 'VIEWER') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const [count, latest] = await Promise.all([
    prisma.issue.count({ where: VIRA_PENDING_WHERE }),
    prisma.issue.findFirst({ where: VIRA_PENDING_WHERE, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, hospitalName: true } }),
  ])
  return NextResponse.json({ count, latest }, { headers: { 'Cache-Control': 'no-store' } })
}
