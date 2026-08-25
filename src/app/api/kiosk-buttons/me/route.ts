import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// บอกฝั่งหน้าเว็บว่า: ล็อกอินอยู่ไหม (ข้ามประตูกรอกชื่อ รพ. ได้), และเป็นแอดมินไหม (โชว์ปุ่มลบ).
// เส้นทางสาธารณะ แต่ตรวจ session ในตัวเอง (คนนอก = ไม่ล็อกอิน = ไม่ใช่แอดมิน).
export async function GET() {
  const session = await auth()
  const u = session?.user as { role?: string; name?: string } | undefined
  return NextResponse.json(
    { loggedIn: !!u, admin: u?.role === 'OFFICE', name: u?.name ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
