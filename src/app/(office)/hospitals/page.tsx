import { prisma } from '@/lib/prisma'
import { HospitalDashboard } from '@/components/HospitalDashboard'

export default async function HospitalsPage() {
  const [hospitals, openIssues] = await Promise.all([
    prisma.hospital.findMany({
      include: { jobs: { where: { isPlanned: false }, select: { currentStatus: true, quantity: true, updatedAt: true, productType: true } } },
      orderBy: { name: 'asc' },
    }),
    // Open claims/problems linked to a hospital via their job — used to flag "มีปัญหา".
    prisma.issue.findMany({
      where: { status: { notIn: ['DONE', 'REJECTED'] }, jobId: { not: null } },
      select: { job: { select: { hospitalId: true } } },
    }),
  ])

  const problemHospitalIds = new Set(openIssues.map((i) => i.job?.hospitalId).filter(Boolean) as string[])
  const isOpen = (st: string) => st !== 'CLOSED' && st !== 'CANCELLED'

  const withJobs = hospitals.filter((h) => h.jobs.length > 0)
  const items = withJobs.map((h) => {
    const openJobs = h.jobs.filter((j) => isOpen(j.currentStatus))
    const hasProblem = problemHospitalIds.has(h.id) || h.jobs.some((j) => j.currentStatus === 'PROBLEM')
    const status: 'NORMAL' | 'PENDING' | 'PROBLEM' = hasProblem ? 'PROBLEM' : openJobs.length > 0 ? 'PENDING' : 'NORMAL'
    const lastMs = h.jobs.reduce((m, j) => Math.max(m, j.updatedAt.getTime()), 0)
    return {
      id: h.id,
      name: h.name,
      province: h.province,
      jobCount: h.jobs.length,
      itemCount: h.jobs.reduce((s, j) => s + j.quantity, 0),
      products: [...new Set(h.jobs.map((j) => j.productType))],
      status,
      updatedAt: lastMs ? new Date(lastMs).toISOString() : null,
    }
  })

  // Overview donut (exclusive status).
  const overview = {
    normal: items.filter((i) => i.status === 'NORMAL').length,
    pending: items.filter((i) => i.status === 'PENDING').length,
    problem: items.filter((i) => i.status === 'PROBLEM').length,
  }

  // Provinces with the most unfinished work (pending + problem hospitals).
  const provMap = new Map<string, number>()
  for (const i of items) if (i.status !== 'NORMAL') provMap.set(i.province, (provMap.get(i.province) ?? 0) + 1)
  const topProvinces = [...provMap.entries()].map(([province, count]) => ({ province, count })).sort((a, b) => b.count - a.count).slice(0, 5)

  // Most-installed products (by unit quantity across all jobs).
  const prodMap = new Map<string, number>()
  for (const h of withJobs) for (const j of h.jobs) prodMap.set(j.productType, (prodMap.get(j.productType) ?? 0) + j.quantity)
  const topProducts = [...prodMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)

  const stats = {
    hospitals: withJobs.length,
    jobs: withJobs.reduce((s, h) => s + h.jobs.length, 0),
    units: withJobs.reduce((s, h) => s + h.jobs.reduce((a, j) => a + j.quantity, 0), 0),
    problem: overview.problem,
  }

  const provinceOptions = [...new Set(items.map((i) => i.province))].filter(Boolean).sort()
  const productOptions = [...prodMap.keys()].sort()

  return (
    <div className="p-4 sm:p-6 max-w-[1220px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">🏥</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">โรงพยาบาลทั้งหมด</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">ติดตามหน่วยงานที่ใช้งานระบบ KIOSK พร้อมจำนวนงาน สินค้า และสถานะล่าสุด</p>
        </div>
      </div>
      <HospitalDashboard items={items} stats={stats} overview={overview} topProvinces={topProvinces} topProducts={topProducts}
        provinceOptions={provinceOptions} productOptions={productOptions} />
    </div>
  )
}
