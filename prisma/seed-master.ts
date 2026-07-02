/**
 * Seed master options (idempotent). Provinces from the canonical list; product
 * types & colors from the values already present on jobs.
 *   npx tsx prisma/seed-master.ts
 */
import { PrismaClient } from '@prisma/client'
import { THAI_PROVINCES } from '../src/lib/options'

const prisma = new PrismaClient()

async function add(category: string, values: string[]) {
  const clean = [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  let i = 0
  await prisma.masterOption.createMany({
    data: clean.map((value) => ({ category, value, sortOrder: i++ })),
    skipDuplicates: true,
  })
  return clean.length
}

async function main() {
  const prov = await add('PROVINCE', [...THAI_PROVINCES])

  const types = await prisma.job.findMany({ distinct: ['productType'], select: { productType: true }, orderBy: { productType: 'asc' } })
  const pt = await add('PRODUCT_TYPE', types.map((t) => t.productType))

  const colors = await prisma.job.findMany({ where: { color: { not: null } }, distinct: ['color'], select: { color: true }, orderBy: { color: 'asc' } })
  const cl = await add('COLOR', colors.map((c) => c.color as string))

  console.log(`seeded master options — PROVINCE:${prov} PRODUCT_TYPE:${pt} COLOR:${cl}`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
