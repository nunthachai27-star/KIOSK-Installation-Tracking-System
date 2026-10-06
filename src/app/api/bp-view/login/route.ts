import { NextResponse } from 'next/server'
import { checkCredentials, bpViewToken, BP_VIEW_COOKIE } from '@/lib/bpViewAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// เข้าสู่ระบบดูหน้าทดสอบความดัน (ดูอย่างเดียว)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const user = String(body?.user ?? '')
  const pass = String(body?.pass ?? '')
  if (!checkCredentials(user, pass)) {
    return NextResponse.json({ error: 'invalid', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(BP_VIEW_COOKIE, bpViewToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 วัน
  })
  return res
}

// ออกจากระบบ
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(BP_VIEW_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
