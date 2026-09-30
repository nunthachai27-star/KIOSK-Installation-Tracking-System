import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// ดึง HTML ของสำเนา (เพื่อเปิดดู/พิมพ์ซ้ำ)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const copy = await prisma.shipReportCopy.findUnique({ where: { id }, select: { id: true, title: true, html: true } })
  if (!copy) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ copy }, { headers: { 'Cache-Control': 'no-store' } })
}

// ลบสำเนา — เจ้าของ หรือ super admin เท่านั้น
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const copy = await prisma.shipReportCopy.findUnique({ where: { id }, select: { id: true, title: true, createdById: true } })
  if (!copy) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const owner = copy.createdById && copy.createdById === session.user.id
  if (!owner && !(await isSuperAdmin())) {
    return NextResponse.json({ error: 'forbidden', message: 'ลบได้เฉพาะผู้บันทึกหรือ super admin' }, { status: 403 })
  }
  await prisma.shipReportCopy.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'สำเนารายงานค่าขนส่ง', `ลบสำเนา ${copy.title}`)
  return NextResponse.json({ ok: true, id })
}
