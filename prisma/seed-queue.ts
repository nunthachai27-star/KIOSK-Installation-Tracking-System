/**
 * Seed sample monitor queue items for a date (default 2026-07-02).
 *   npx tsx prisma/seed-queue.ts [YYYY-MM-DD]
 */
import { PrismaClient, type ActivityType } from '@prisma/client'

const prisma = new PrismaClient()
const DATE = process.argv[2] || '2026-07-02'

const items: { hosp: string; type: ActivityType; staff: string; time: string }[] = [
  { hosp: 'ปทุมธานี', type: 'QC', staff: 'ภัทรดล', time: '09:00' },
  { hosp: 'เชียงกลาง', type: 'DELIVERY', staff: 'สิทธิชัย', time: '09:30' },
  { hosp: 'สวนผึ้ง', type: 'HANDOVER', staff: 'ภัทรดล', time: '13:30' },
]

async function main() {
  const from = new Date(`${DATE}T00:00:00`)
  const to = new Date(`${DATE}T23:59:59`)
  await prisma.jobActivity.deleteMany({ where: { activityDate: { gte: from, lte: to } } })

  for (const it of items) {
    const job = await prisma.job.findFirst({ where: { hospital: { name: { contains: it.hosp } } } })
    if (!job) { console.log('SKIP (no job):', it.hosp); continue }
    const user = await prisma.user.findFirst({ where: { name: { contains: it.staff } } })
    await prisma.jobActivity.create({
      data: {
        jobId: job.id,
        activityType: it.type,
        activityDate: new Date(`${DATE}T${it.time}:00`),
        responsibleUserId: user?.id ?? null,
        status: 'SCHEDULED',
      },
    })
    console.log('added:', it.time, it.type, it.hosp, '→', user?.name ?? '(no staff)')
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
