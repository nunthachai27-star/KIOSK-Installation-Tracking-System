import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/superAdmin'
import { restoreAudit } from '@/lib/restore'

export const dynamic = 'force-dynamic'

// ย้อนคืนรายการตาม log id — เฉพาะ super admin
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้น' }, { status: 403 })
  const session = await auth()
  const { id } = await params
  const res = await restoreAudit(id, session?.user)
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
