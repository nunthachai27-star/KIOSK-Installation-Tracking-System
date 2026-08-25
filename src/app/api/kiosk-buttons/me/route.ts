import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// บอกฝั่งหน้าเว็บว่าเป็นแอดมิน (เจ้าหน้าที่ล็อกอิน) ไหม — เพื่อโชว์ปุ่มลบในแกลเลอรี.
// เส้นทางสาธารณะ แต่ตรวจ session ในตัวเอง (คนนอก = ไม่ใช่แอดมิน).
export async function GET() {
  const session = await auth()
  return NextResponse.json(
    { admin: session?.user?.role === 'OFFICE' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
