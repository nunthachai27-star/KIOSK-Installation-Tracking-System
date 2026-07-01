/**
 * Reconcile job statuses to the source document, then apply the year rule:
 *   - contract-start year <= 2025 (BE <= 2568)  -> DATA_ENTRY ("เปิดงาน")
 *   - year 2026 (BE 2569) / no year              -> status derived from the Excel
 *
 *   npx tsx prisma/reconcile-status.ts "<file.xlsx>"
 */
import { PrismaClient } from '@prisma/client'
import { parseWorkbook, statusFor } from './import-kiosk'

const prisma = new PrismaClient()
const file = process.argv[2]
if (!file) { console.error('usage: tsx prisma/reconcile-status.ts <file.xlsx>'); process.exit(2) }

async function main() {
  const drafts = parseWorkbook(file)
  const docStatus = new Map(drafts.map((d) => [d.jobCode, statusFor(d)]))

  const jobs = await prisma.job.findMany({ select: { id: true, jobCode: true, contractStartDate: true } })
  let opened = 0, restored = 0
  for (const j of jobs) {
    const y = j.contractStartDate ? j.contractStartDate.getUTCFullYear() : null
    let status: string
    if (y != null && y <= 2025) { status = 'DATA_ENTRY'; opened++ }
    else { status = docStatus.get(j.jobCode) ?? 'DATA_ENTRY'; restored++ }
    await prisma.job.update({ where: { id: j.id }, data: { currentStatus: status as never } })
  }
  console.log(`opened(<=2025 -> DATA_ENTRY)=${opened}  doc-status(2026/other)=${restored}  total=${jobs.length}`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
