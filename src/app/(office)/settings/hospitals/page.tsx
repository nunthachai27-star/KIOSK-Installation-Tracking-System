import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getMasterValues } from '@/lib/master'
import { THAI_PROVINCES } from '@/lib/options'
import { HospitalManager } from '@/components/HospitalManager'

export default async function SettingsHospitalsPage() {
  const [hospitals, provinces] = await Promise.all([
    prisma.hospital.findMany({
      include: { _count: { select: { jobs: true } }, contacts: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    getMasterValues('PROVINCE'),
  ])

  const items = hospitals.map((h) => ({
    id: h.id, name: h.name, province: h.province, jobCount: h._count.jobs,
    code: h.code ?? '', address: h.address ?? '',
    contacts: h.contacts.map((c) => ({ name: c.name, phone: c.phone ?? '', position: c.position ?? '', note: c.note ?? '' })),
  }))
  const provinceOptions = (provinces.length ? provinces : [...THAI_PROVINCES]).slice()

  return (
    <div className="p-6 max-w-[820px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">โรงพยาบาล</h1>
      </div>
      <p className="text-[13px] text-[#8492A6] -mt-2">แก้ไขชื่อ/จังหวัด · กด “รายละเอียด” เพื่อกรอก รหัสสถานพยาบาล ที่อยู่ และผู้ติดต่อ (เพิ่มได้หลายคน) · การเปลี่ยนชื่อมีผลกับทุกงานที่อ้างอิงทันที · ลบได้เฉพาะที่ยังไม่มีงาน</p>
      <HospitalManager initial={items} provinceOptions={provinceOptions} />
    </div>
  )
}
