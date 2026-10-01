import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isSuperAdmin } from '@/lib/superAdmin'
import { ServerMonitor } from '@/components/ServerMonitor'

export const dynamic = 'force-dynamic'

export default async function ServerMonitorPage() {
  if (!(await isSuperAdmin())) notFound() // เฉพาะ super admin

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dev" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ พัฒนา</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">สถานะเครื่องเซิร์ฟเวอร์</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">ดู load / แรม / swap ของเครื่องแบบสด เพื่อเลือกช่วงที่ deploy ได้ปลอดภัย (ไฟเขียว)</p>
      <ServerMonitor />
    </div>
  )
}
