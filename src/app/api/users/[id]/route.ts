import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isThemeKey, isBgKey } from '@/lib/themes'

// Edit a staff member's nickname (ชื่อเล่น) or profile avatar (icon/photo/colour).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  // OFFICE can edit anyone; a user may always edit their own profile.
  if (session?.user?.role !== 'OFFICE' && session?.user?.id !== id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: { nickname?: string | null; avatarIcon?: string | null; avatarColor?: string | null; avatarUrl?: string | null; theme?: string | null; bg?: string | null } = {}
  if (body.theme !== undefined) data.theme = isThemeKey(body.theme) ? body.theme : null
  if (body.bg !== undefined) data.bg = isBgKey(body.bg) ? body.bg : null
  if (body.nickname !== undefined) data.nickname = typeof body.nickname === 'string' && body.nickname.trim() ? body.nickname.trim() : null
  if (body.avatarIcon !== undefined) data.avatarIcon = typeof body.avatarIcon === 'string' && body.avatarIcon.trim() ? body.avatarIcon.trim().slice(0, 16) : null
  if (body.avatarColor !== undefined) data.avatarColor = typeof body.avatarColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(body.avatarColor) ? body.avatarColor : null
  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl === null || body.avatarUrl === '') data.avatarUrl = null
    else if (typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/') && body.avatarUrl.length <= 700_000) data.avatarUrl = body.avatarUrl
    else return NextResponse.json({ error: 'bad image', message: 'รูปไม่ถูกต้องหรือใหญ่เกินไป' }, { status: 400 })
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.user.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await logAction(session.user, 'UPDATE', 'ผู้ใช้', `แก้โปรไฟล์ ${updated.name}`)
  return NextResponse.json({ id: updated.id, nickname: updated.nickname })
}
