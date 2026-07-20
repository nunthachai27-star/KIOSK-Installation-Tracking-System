import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StaffNicknameManager } from '@/components/StaffNicknameManager'

export default async function SettingsStaffPage() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, nickname: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="p-6 max-w-[720px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[#EA580C]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">เจ้าหน้าที่ (ชื่อเล่น)</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">กำหนดชื่อเล่นของเจ้าหน้าที่ · จะแสดงในหัวรายงานปฏิบัติงาน เช่น “นายจักรกฤษณ์ มนตรีวงษ์ (เสือ)”</p>
      <StaffNicknameManager initial={users} />
    </div>
  )
}
