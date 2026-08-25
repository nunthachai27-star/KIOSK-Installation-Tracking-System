import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// บันทึกการใช้งานต่อโรงพยาบาล (เฉพาะเจ้าหน้าที่ที่ล็อกอิน) — ใครลงทะเบียนใช้บ้าง
// กี่ดีไซน์ ใช้ครั้งแรก/ล่าสุดเมื่อไหร่. คนนอก (ไม่ล็อกอิน) เข้าไม่ได้.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const groups = await prisma.kioskButtonDesign.groupBy({
    by: ['hospital'],
    _count: { _all: true },
    _max: { createdAt: true },
    _min: { createdAt: true },
  })

  const rows = groups
    .map((g) => ({
      hospital: g.hospital,
      count: g._count._all,
      lastAt: g._max.createdAt,
      firstAt: g._min.createdAt,
    }))
    .sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0))

  const total = rows.reduce((s, r) => s + r.count, 0)
  return NextResponse.json(
    { rows, total, hospitals: rows.length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
