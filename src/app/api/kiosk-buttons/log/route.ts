import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Row = { hospital: string; count: number; registeredAt: Date; lastAt: Date }
const maxD = (a: Date, b: Date | null) => (b && b > a ? b : a)
const minD = (a: Date, b: Date | null) => (b && b < a ? b : a)

// บันทึกการใช้งานต่อโรงพยาบาล (เฉพาะเจ้าหน้าที่ที่ล็อกอิน) — รวม "ทะเบียนที่ลงทะเบียน"
// เข้ากับ "จำนวนดีไซน์" ที่ส่งเข้าแกลเลอรี. ขึ้นทุก รพ. ที่ลงทะเบียน แม้ยังไม่มีดีไซน์.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [regs, groups] = await Promise.all([
    prisma.kioskHospital.findMany({ select: { name: true, createdAt: true, lastSeenAt: true } }),
    prisma.kioskButtonDesign.groupBy({
      by: ['hospital'],
      _count: { _all: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    }),
  ])

  const map = new Map<string, Row>()
  for (const r of regs) {
    map.set(r.name, { hospital: r.name, count: 0, registeredAt: r.createdAt, lastAt: r.lastSeenAt })
  }
  for (const g of groups) {
    const ex = map.get(g.hospital)
    if (ex) {
      ex.count = g._count._all
      ex.lastAt = maxD(ex.lastAt, g._max.createdAt)
      ex.registeredAt = minD(ex.registeredAt, g._min.createdAt)
    } else {
      // ดีไซน์ที่ไม่มีในทะเบียน (เช่นส่งก่อนมีระบบทะเบียน) — ให้ขึ้น log ด้วย
      map.set(g.hospital, {
        hospital: g.hospital,
        count: g._count._all,
        registeredAt: g._min.createdAt ?? new Date(),
        lastAt: g._max.createdAt ?? new Date(),
      })
    }
  }

  const rows = [...map.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
  const total = rows.reduce((s, r) => s + r.count, 0)
  return NextResponse.json(
    { rows, hospitals: rows.length, total },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
