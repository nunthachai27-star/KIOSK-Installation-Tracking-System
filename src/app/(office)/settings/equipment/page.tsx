import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getMasterValues, EQUIPMENT_PREFIX } from '@/lib/master'

// Claim equipment is managed per product type (category = EQUIPMENT_ITEM:<type>).
// This page lists product types with their equipment count and links to each editor.
export default async function EquipmentSettingsPage() {
  const [productTypes, eqCounts] = await Promise.all([
    getMasterValues('PRODUCT_TYPE'),
    prisma.masterOption.groupBy({ by: ['category'], _count: true, where: { category: { startsWith: EQUIPMENT_PREFIX }, active: true } }),
  ])
  const countByType = new Map(eqCounts.map((c) => [c.category.slice(EQUIPMENT_PREFIX.length), c._count]))
  // Show every product type, plus any equipment-only type that isn't in the master list.
  const types = [...new Set([...productTypes, ...countByType.keys()])].sort((a, b) => a.localeCompare(b, 'th'))

  return (
    <div className="p-6 max-w-[720px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[#EA580C]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">รายการอุปกรณ์ (เคลม)</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-1">แต่ละประเภทสินค้ามีรายการอุปกรณ์ของตัวเอง — ใช้เป็นตัวเลือกในฟอร์มแจ้งเคลม</p>

      <div className="ds-card overflow-hidden">
        {types.length === 0 && <div className="px-4 py-6 text-sm text-[#8492A6]">ยังไม่มีประเภทสินค้า — เพิ่มได้ที่หมวด “ประเภทสินค้า”</div>}
        {types.map((t) => (
          <Link key={t} href={`/settings/equipment/${encodeURIComponent(t)}`}
            className="ds-hover flex items-center gap-3 px-4 py-3 border-t border-[#EEF2F8] first:border-t-0 hover:bg-[#F8FAFD]">
            <span className="flex-1 text-[14px] font-semibold text-[#1C1917]">{t}</span>
            <span className="text-[12.5px] text-[#8492A6]">{countByType.get(t) ?? 0} รายการ</span>
            <span className="text-[12.5px] font-semibold text-[#EA580C]">จัดการ ›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
