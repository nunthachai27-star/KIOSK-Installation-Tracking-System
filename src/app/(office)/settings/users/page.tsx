import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin, SUPER_ADMIN_USERNAMES } from '@/lib/superAdmin'
import { UsersManager } from '@/components/UsersManager'

export const dynamic = 'force-dynamic'

export default async function SettingsUsersPage() {
  if (!(await isSuperAdmin())) notFound() // เฉพาะ super admin

  const rows = await prisma.user.findMany({
    select: { id: true, username: true, name: true, nickname: true, role: true, active: true },
    orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }],
  })
  // ติดธง super admin (อิงจาก username ใน SUPER_ADMIN_USERNAMES)
  const users = rows.map((u) => ({ ...u, isSuper: SUPER_ADMIN_USERNAMES.includes(u.username.trim().toLowerCase()) }))

  return (
    <div className="p-6 max-w-[840px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">จัดการผู้ใช้</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">เพิ่มผู้ใช้ · เลือกสิทธิ์ (role) · รีเซ็ตรหัสผ่าน · เปิด/ปิดใช้งาน — เฉพาะ super admin</p>
      <UsersManager initial={users} />
    </div>
  )
}
