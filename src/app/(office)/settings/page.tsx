import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MASTER_CATEGORIES } from '@/lib/master'

export default async function SettingsPage() {
  const counts = await prisma.masterOption.groupBy({ by: ['category'], _count: true, where: { active: true } })
  const countMap = new Map(counts.map((c) => [c.category, c._count]))

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#12233B]">ตั้งค่า · ข้อมูลพื้นฐาน</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">กำหนดรายการที่ใช้เป็นตัวเลือกในฟอร์มงาน</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MASTER_CATEGORIES.map((c) => (
          <Link key={c.key} href={`/settings/${c.key}`} className="ds-card ds-hover ds-lift p-5">
            <div className="font-bold text-[15px] text-[#12233B]">{c.label}</div>
            <div className="text-[13px] text-[#8492A6] mt-1">{countMap.get(c.key) ?? 0} รายการที่เปิดใช้งาน</div>
            <div className="text-[12.5px] font-semibold text-[#2F6BED] mt-3">จัดการ ›</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
