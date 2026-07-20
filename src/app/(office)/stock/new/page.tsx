import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StockReceiveForm } from '@/components/StockReceiveForm'

export default async function StockNewPage() {
  const products = await prisma.stockProduct.findMany({
    where: { active: true },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    select: { id: true, group: true, name: true, unit: true },
  })
  const groups = [...new Set(products.map((p) => p.group))].sort()

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stock" className="text-[#5A6B82] hover:text-[#EA580C]">‹ คลังสินค้า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">เพิ่มข้อมูลสินค้า / รับเข้าคลัง</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">เลือกรุ่นที่มีอยู่หรือสร้างรุ่นใหม่ · ระบุ Lot ที่รับเข้า · ใส่ Serial รายเครื่อง หรือระบุจำนวน</p>
      <StockReceiveForm products={products} groups={groups} />
    </div>
  )
}
