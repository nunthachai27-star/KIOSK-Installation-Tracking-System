import { prisma } from '@/lib/prisma'
import { ProductRegistry } from '@/components/ProductRegistry'
import { productCategory } from '@/lib/product-category'

// Product asset registry — one row per BMS unit serial (the physical machine),
// showing which product it is, which hospital it's installed at, and its status.
export default async function ProductsPage() {
  const serials = await prisma.serialNumber.findMany({
    where: { serialType: 'BMS' },
    select: {
      id: true, serialNo: true,
      job: {
        select: {
          jobCode: true, productType: true, province: true, currentStatus: true, contractStartDate: true,
          hospital: { select: { name: true } },
        },
      },
    },
    orderBy: { serialNo: 'asc' },
  })

  const items = serials.map((s) => ({
    id: s.id,
    serialNo: s.serialNo,
    productType: s.job.productType,
    category: productCategory(s.job.productType),
    hospital: s.job.hospital.name,
    province: s.job.province,
    status: s.job.currentStatus,
    jobCode: s.job.jobCode,
    year: s.job.contractStartDate ? s.job.contractStartDate.getFullYear() : null,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">ทะเบียนสินค้า</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">รายการสินค้าทั้งหมดแยกตาม S/N ของเครื่อง · แสดงว่าติดตั้งที่โรงพยาบาลไหน · สรุปจำนวนแต่ละรุ่น (Kiosk / Mini Kiosk / ฯลฯ)</p>
      </div>
      <ProductRegistry items={items} />
    </div>
  )
}
