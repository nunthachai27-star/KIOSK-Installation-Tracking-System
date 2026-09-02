import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ค้นหาโรงพยาบาล (ชื่อ/จังหวัด/รหัส) พร้อมที่อยู่ + ผู้ติดต่อ — สำหรับป้ายที่อยู่จัดส่ง
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const rows = await prisma.hospital.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { province: { contains: q } }, { code: { contains: q } }] } : {},
    orderBy: { name: 'asc' },
    take: 10,
    select: {
      id: true, name: true, province: true, code: true, address: true,
      contacts: { orderBy: { sortOrder: 'asc' }, select: { name: true, phone: true, position: true } },
    },
  })
  return NextResponse.json({ items: rows }, { headers: { 'Cache-Control': 'no-store' } })
}
