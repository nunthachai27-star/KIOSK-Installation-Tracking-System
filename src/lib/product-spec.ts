import { prisma } from './prisma'

// Defaults used when a product type has no configured checklist rows.
export const DEFAULT_CHECKLIST = [
  'อุปกรณ์ครบตามรายการ',
  'ทดสอบเปิด-ปิดเครื่อง',
  'ทดสอบ Smart Card Reader',
  'ทดสอบเครื่องพิมพ์',
  'ตรวจสภาพภายนอก/สี',
]

export type ProductComponentSpec = { name: string; quantity: number; needsSerial: boolean }

// Resolved QC spec for a product type: checklist items + component list (BOM) +
// BMS code. Checklist falls back to a default when none configured.
export async function getProductSpec(
  productType: string,
): Promise<{ checklist: string[]; components: ProductComponentSpec[]; bmsCode: string | null }> {
  const [cl, comps, bms] = await Promise.all([
    prisma.productChecklistItem.findMany({
      where: { productType, active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    }),
    prisma.productComponent.findMany({
      where: { productType, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, quantity: true, needsSerial: true },
    }),
    prisma.productBmsCode.findUnique({ where: { productType }, select: { code: true } }),
  ])
  return {
    checklist: cl.length ? cl.map((c) => c.label) : DEFAULT_CHECKLIST,
    components: comps,
    bmsCode: bms?.code ?? null,
  }
}

// Every product type that can be configured: master options + any used on a job.
export async function getProductTypesForConfig(): Promise<string[]> {
  const [master, jobs] = await Promise.all([
    prisma.masterOption.findMany({ where: { category: 'PRODUCT_TYPE', active: true }, select: { value: true } }),
    prisma.job.findMany({ distinct: ['productType'], select: { productType: true } }),
  ])
  const set = new Set<string>()
  master.forEach((m) => set.add(m.value))
  jobs.forEach((j) => { if (j.productType) set.add(j.productType) })
  return [...set].sort((a, b) => a.localeCompare(b, 'th'))
}
