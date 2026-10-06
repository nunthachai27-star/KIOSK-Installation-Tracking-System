import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'
import type { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const ROLES: { value: Role; label: string }[] = [
  { value: 'OFFICE', label: 'เจ้าหน้าที่ (สำนักงาน) — เข้าเว็บเดสก์ท็อป แก้ไขได้' },
  { value: 'FIELD', label: 'ภาคสนาม (มือถือ) — ใช้แอปหน้างาน' },
  { value: 'VIEWER', label: 'ผู้ชม — ดูได้ทุกหน้า แก้/ลบไม่ได้' },
  { value: 'EXECUTIVE', label: 'ผู้บริหาร' },
  { value: 'TECHNICIAN', label: 'ช่างเทคนิค' },
  { value: 'ADMIN', label: 'แอดมิน' },
]
const ROLE_SET = new Set(ROLES.map((r) => r.value as string))

// สร้างผู้ใช้ใหม่ — เฉพาะ super admin
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin เท่านั้นที่เพิ่มผู้ใช้ได้' }, { status: 403 })

  const b = await req.json().catch(() => null)
  const username = String(b?.username ?? '').trim().toLowerCase()
  const name = String(b?.name ?? '').trim()
  const nickname = String(b?.nickname ?? '').trim()
  const password = String(b?.password ?? '')
  const role = String(b?.role ?? '')

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return NextResponse.json({ error: 'bad', message: 'ชื่อผู้ใช้ 3-30 ตัว (a-z 0-9 . _ - ไม่มีช่องว่าง)' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'bad', message: 'ระบุชื่อ-นามสกุล' }, { status: 400 })
  if (password.length < 4) return NextResponse.json({ error: 'bad', message: 'รหัสผ่านอย่างน้อย 4 ตัว' }, { status: 400 })
  if (!ROLE_SET.has(role)) return NextResponse.json({ error: 'bad', message: 'เลือกสิทธิ์ (role) ไม่ถูกต้อง' }, { status: 400 })

  const dup = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (dup) return NextResponse.json({ error: 'dup', message: `มีชื่อผู้ใช้ "${username}" อยู่แล้ว` }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)
  const created = await prisma.user.create({
    data: { username, name, nickname: nickname || null, passwordHash, role: role as Role, active: true },
    select: { id: true, username: true, name: true, nickname: true, role: true, active: true },
  })
  await logAction(session.user, 'CREATE', 'ผู้ใช้', `เพิ่มผู้ใช้ ${created.username} (${created.role})`)
  return NextResponse.json({ ok: true, user: created }, { status: 201 })
}
