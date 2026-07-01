import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Safety guard: this seed wipes all data (deleteMany) and creates well-known
  // dev accounts (password "1234"). Prisma runs it automatically during
  // `migrate dev`/`migrate reset`, so refuse to run against a production DB
  // unless explicitly overridden.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error(
      'Refusing to run destructive seed with NODE_ENV=production. ' +
        'Set ALLOW_DESTRUCTIVE_SEED=true only if you really intend to wipe and seed this database.',
    )
  }

  await prisma.jobActivity.deleteMany()
  await prisma.serialNumber.deleteMany()
  await prisma.job.deleteMany()
  await prisma.hospital.deleteMany()
  await prisma.user.deleteMany()

  const pw = await bcrypt.hash('1234', 10)
  const office1 = await prisma.user.create({ data: { username: 'office1', passwordHash: pw, name: 'จันทนา', role: 'OFFICE', avatarColor: '#EAF1FF' } })
  const field1  = await prisma.user.create({ data: { username: 'field1', passwordHash: pw, name: 'ประเสริฐ', role: 'FIELD', avatarColor: '#E9EAFB' } })
  const field2  = await prisma.user.create({ data: { username: 'field2', passwordHash: pw, name: 'อนุชา', role: 'FIELD', avatarColor: '#DCF1F2' } })

  const hospData = [
    { name: 'โรงพยาบาลศรีนครินทร์', province: 'ขอนแก่น' },
    { name: 'โรงพยาบาลมหาราชนครเชียงใหม่', province: 'เชียงใหม่' },
    { name: 'โรงพยาบาลสงขลานครินทร์', province: 'สงขลา' },
    { name: 'โรงพยาบาลชลบุรี', province: 'ชลบุรี' },
    { name: 'โรงพยาบาลอุดรธานี', province: 'อุดรธานี' },
    { name: 'โรงพยาบาลสระบุรี', province: 'สระบุรี' },
    { name: 'โรงพยาบาลบุรีรัมย์', province: 'บุรีรัมย์' },
    { name: 'โรงพยาบาลนครพิงค์', province: 'เชียงใหม่' },
  ]
  const hosp: Record<string, string> = {}
  for (const h of hospData) { const r = await prisma.hospital.create({ data: h }); hosp[h.name] = r.id }

  const jobs = [
    { jobCode: 'JOB-2568-0142', hospital: 'โรงพยาบาลศรีนครินทร์', province: 'ขอนแก่น', productType: 'Kiosk HI-END', productModel: 'HE-2024 + Smart Card Reader', color: 'ขาว-น้ำเงิน', quantity: 2, salesAmount: 1850000, contactName: 'คุณกนกวรรณ (ฝ่าย IT)', contactPhone: '043-363-xxx', contractNo: 'PO-2568-0471', currentStatus: 'INSTALLING' as const, deliveryDueDate: new Date('2026-07-15'), adminOwnerId: office1.id, installerOwnerId: field2.id },
    { jobCode: 'JOB-2568-0138', hospital: 'โรงพยาบาลมหาราชนครเชียงใหม่', province: 'เชียงใหม่', productType: 'Kiosk HI-END', quantity: 3, salesAmount: 2640000, currentStatus: 'READY_TO_SHIP' as const, adminOwnerId: office1.id, installerOwnerId: field2.id },
    { jobCode: 'JOB-2568-0129', hospital: 'โรงพยาบาลอุดรธานี', province: 'อุดรธานี', productType: 'QR Payment', quantity: 6, salesAmount: 540000, currentStatus: 'PROBLEM' as const, deliveryDueDate: new Date('2026-06-20'), adminOwnerId: office1.id, installerOwnerId: field1.id },
    { jobCode: 'JOB-2568-0126', hospital: 'โรงพยาบาลสระบุรี', province: 'สระบุรี', productType: 'Mini Kiosk', quantity: 2, salesAmount: 760000, currentStatus: 'HANDED_OVER' as const, adminOwnerId: office1.id, installerOwnerId: field1.id },
    { jobCode: 'JOB-2568-0121', hospital: 'โรงพยาบาลบุรีรัมย์', province: 'บุรีรัมย์', productType: 'ชุดปิดสิทธิ', quantity: 4, salesAmount: 980000, currentStatus: 'CLOSED' as const, adminOwnerId: office1.id, installerOwnerId: field2.id },
  ]
  for (const j of jobs) {
    const { hospital, ...rest } = j
    await prisma.job.create({ data: { ...rest, hospitalId: hosp[hospital] } })
  }

  // activities this week (relative to a fixed seed date range around 2026-07-01)
  const j0142 = await prisma.job.findUniqueOrThrow({ where: { jobCode: 'JOB-2568-0142' } })
  await prisma.jobActivity.createMany({ data: [
    { jobId: j0142.id, activityType: 'DELIVERY', activityDate: new Date('2026-06-30T09:00:00Z'), responsibleUserId: field2.id, status: 'IN_PROGRESS' },
    { jobId: j0142.id, activityType: 'ONSITE', activityDate: new Date('2026-07-01T10:00:00Z'), responsibleUserId: field2.id, status: 'SCHEDULED' },
  ] })

  console.log('Seeded users, hospitals, jobs, activities.')
}

main().finally(() => prisma.$disconnect())
