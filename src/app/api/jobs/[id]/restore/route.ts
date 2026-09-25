import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// กู้คืนงานจากถังขยะ — เฉพาะ super admin
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบสูงสุด' }, { status: 403 })
  const session = await auth()
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { jobCode: true, deletedAt: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.job.update({ where: { id }, data: { deletedAt: null, deletedBy: null } })
  await logAction(session?.user, 'CREATE', 'งาน', `กู้คืนงาน ${job.jobCode} จากถังขยะ`)
  return NextResponse.json({ ok: true })
}
