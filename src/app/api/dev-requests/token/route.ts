import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { rotateDevToken, setTeamNote, str } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── POST: สร้างลิงก์ทีมพัฒนาใหม่ (revoke ลิงก์เดิม) — ใช้เมื่อลิงก์เดิมรั่ว ───────
export async function POST() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const token = await rotateDevToken(session.user.name)
  await logAction(session.user, 'UPDATE', 'คำขอพัฒนา', 'สร้างลิงก์ทีมพัฒนาใหม่ (ยกเลิกลิงก์เดิม)')
  return NextResponse.json({ ok: true, token }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── PATCH: ตั้งโน้ตหัวบอร์ด "ทีมพัฒนาคือใคร" ─────────────────────────────────
export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const note = str(b.teamNote, 500, { multiline: true }) || null
  await setTeamNote(note, session.user.name)
  return NextResponse.json({ ok: true, teamNote: note }, { headers: { 'Cache-Control': 'no-store' } })
}
