import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// แอดมิน (เจ้าหน้าที่ที่ล็อกอิน) ลบดีไซน์ในแกลเลอรีที่ไม่เหมาะสมออกได้.
// เส้นทางนี้เปิดผ่าน middleware (อยู่ใต้ /api/kiosk-buttons) แต่บังคับสิทธิ์ในตัวจัดการเอง.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const row = await prisma.kioskButtonDesign.findUnique({ where: { id }, select: { hospital: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.kioskButtonDesign.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'ออกแบบปุ่ม Kiosk', `ลบดีไซน์ของ "${row.hospital}"`)
  return NextResponse.json({ ok: true, id })
}
