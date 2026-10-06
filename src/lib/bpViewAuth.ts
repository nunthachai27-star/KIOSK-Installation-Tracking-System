import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// ล็อกอินแบบง่ายสำหรับ "ลิงก์ดูอย่างเดียว" ของหน้าทดสอบรับค่าเครื่องวัดความดัน
// (แยกจาก next-auth — ผู้ชมภายนอกไม่ต้องมี account ในระบบ)
// เปลี่ยน user/pass ได้ที่ env: BP_VIEW_USER / BP_VIEW_PASS
export const BP_VIEW_USER = process.env.BP_VIEW_USER ?? 'bms'
export const BP_VIEW_PASS = process.env.BP_VIEW_PASS ?? '@1234'
export const BP_VIEW_COOKIE = 'bp_view'

// token = HMAC(secret, pass) — ผูกกับรหัสผ่าน (ถ้าเปลี่ยนรหัส cookie เก่าจะใช้ไม่ได้)
export function bpViewToken(): string {
  const secret = process.env.AUTH_SECRET || 'bp-view-fallback-secret'
  return createHmac('sha256', secret).update(`bpview:${BP_VIEW_PASS}`).digest('hex')
}

export function checkCredentials(user: string, pass: string): boolean {
  return user.trim() === BP_VIEW_USER && pass === BP_VIEW_PASS
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

// ตรวจว่า cookie ที่ส่งมาถูกต้องไหม (เรียกใน server component ของหน้า /bp-view)
export async function isBpViewer(): Promise<boolean> {
  try {
    const c = (await cookies()).get(BP_VIEW_COOKIE)?.value
    return !!c && safeEq(c, bpViewToken())
  } catch {
    return false
  }
}
