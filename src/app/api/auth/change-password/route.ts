import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MIN_LEN = 4

// Let the signed-in user change their own password. Scoped to session.user.id —
// a user can only ever change their own, and must prove the current password first.
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'missing', message: 'กรอกรหัสผ่านให้ครบ' }, { status: 400 })
  }
  if (newPassword.length < MIN_LEN) {
    return NextResponse.json({ error: 'too short', message: `รหัสผ่านใหม่ต้องยาวอย่างน้อย ${MIN_LEN} ตัว` }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true, active: true } })
  if (!user || !user.active) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'wrong current', message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 })

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: 'same', message: 'รหัสผ่านใหม่ต้องต่างจากเดิม' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } })
  return NextResponse.json({ ok: true })
}
