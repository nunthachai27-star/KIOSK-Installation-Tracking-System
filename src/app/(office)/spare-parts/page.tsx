import { prisma } from '@/lib/prisma'
import { SparePartManager } from '@/components/SparePartManager'

export default async function SparePartsPage() {
  const parts = await prisma.sparePart.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
  const items = parts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    stockQty: p.stockQty,
    sellPrice: p.sellPrice ? p.sellPrice.toNumber() : null,
    serviceFee1: p.serviceFee1 ? p.serviceFee1.toNumber() : null,
    serviceFee2: p.serviceFee2 ? p.serviceFee2.toNumber() : null,
    requiresOnsite: p.requiresOnsite,
    remark: p.remark,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">คลังอะไหล่ (Spare Parts)</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">สต็อกอะไหล่คงเหลือ · ราคาขายลูกค้า + ค่าบริการช่าง สำหรับเสนอราคาเคสนอกประกัน</p>
      </div>
      <SparePartManager initial={items} />
    </div>
  )
}
