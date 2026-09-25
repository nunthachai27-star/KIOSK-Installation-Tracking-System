import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// ลบงานถาวร (ออกจากถังขยะ) — เฉพาะ super admin · ลบจริงพร้อมข้อมูลลูกทั้งหมด (cascade)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบสูงสุด' }, { status: 403 })
  const session = await auth()
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { jobCode: true, deletedAt: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // ปลอดภัย: ลบถาวรได้เฉพาะงานที่อยู่ในถังขยะแล้วเท่านั้น
  if (!job.deletedAt) return NextResponse.json({ error: 'ต้องย้ายลงถังขยะก่อนจึงลบถาวรได้' }, { status: 400 })
  await prisma.job.delete({ where: { id } })
  await logAction(session?.user, 'DELETE', 'งาน', `ลบถาวรงาน ${job.jobCode} (ออกจากถังขยะ)`)
  return NextResponse.json({ ok: true })
}
