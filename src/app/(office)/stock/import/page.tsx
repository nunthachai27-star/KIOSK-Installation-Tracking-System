import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/superAdmin'
import { StockImportForm } from '@/components/StockImportForm'

export const dynamic = 'force-dynamic'

export default async function StockImportPage() {
  if (!(await isSuperAdmin())) notFound() // เฉพาะ super admin

  const products = await prisma.stockProduct.findMany({
    where: { active: true },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    select: {
      id: true, group: true, name: true,
      lots: { orderBy: { createdAt: 'desc' }, select: { id: true, lotCode: true } },
    },
  })
  const groups = [...new Set(products.map((p) => p.group))].sort()

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stock" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ คลังสินค้า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">นำเข้าสต็อกจาก Excel / Google Sheet</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">เลือกกลุ่ม → รุ่น → Lot (หรือพิมพ์ Lot ใหม่) → อัปไฟล์ หรือวางลิงก์ Google Sheet (Serial NO. + วันรับเข้า ต่อแถว) → ตรวจ → ยืนยัน · เจอ serial ซ้ำจะหยุดให้แก้ก่อน · เฉพาะ super admin</p>
      <StockImportForm products={products} groups={groups} />
    </div>
  )
}
