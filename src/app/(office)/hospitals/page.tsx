import { prisma } from '@/lib/prisma'
import { HospitalList } from '@/components/HospitalList'

export default async function HospitalsPage() {
  const hospitals = await prisma.hospital.findMany({
    include: { jobs: { select: { quantity: true } } },
    orderBy: { name: 'asc' },
  })

  const items = hospitals
    .filter((h) => h.jobs.length > 0)
    .map((h) => ({
      id: h.id,
      name: h.name,
      province: h.province,
      jobCount: h.jobs.length,
      itemCount: h.jobs.reduce((s, j) => s + j.quantity, 0),
    }))

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">โรงพยาบาล</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">ดูสินค้า/อุปกรณ์ที่แต่ละโรงพยาบาลมี · {items.length} แห่งที่มีงาน</p>
      </div>
      <HospitalList items={items} />
    </div>
  )
}
