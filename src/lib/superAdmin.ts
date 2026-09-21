import { auth } from './auth'
import { prisma } from './prisma'

// รายชื่อ username ที่เป็น "super admin" (สิทธิ์ลบข้อมูลรายงานการวัด ฯลฯ)
export const SUPER_ADMIN_USERNAMES = ['jakkrit']

// เช็คว่าผู้ใช้ที่ล็อกอินอยู่เป็น super admin ไหม (อิงจาก username ใน DB — ไม่ผูกกับ role)
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) return false
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } })
  return !!u && SUPER_ADMIN_USERNAMES.includes(u.username.trim().toLowerCase())
}
