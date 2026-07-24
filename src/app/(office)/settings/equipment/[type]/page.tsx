import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { equipmentCategory } from '@/lib/master'
import { MasterOptionManager } from '@/components/MasterOptionManager'

// Manage the claim-equipment list for one product type.
export default async function EquipmentTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const productType = decodeURIComponent(type)
  const category = equipmentCategory(productType)

  const items = await prisma.masterOption.findMany({
    where: { category },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    select: { id: true, value: true, active: true },
  })

  return (
    <div className="p-6 max-w-[720px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[#EA580C]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <Link href="/settings/equipment" className="text-[#5A6B82] hover:text-[#EA580C]">รายการอุปกรณ์</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">{productType}</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-1">รายการอุปกรณ์ของ “{productType}” — ใช้เป็นตัวเลือกในฟอร์มแจ้งเคลมเมื่อเลือกประเภทสินค้านี้</p>
      <MasterOptionManager category={category} initial={items} />
    </div>
  )
}
