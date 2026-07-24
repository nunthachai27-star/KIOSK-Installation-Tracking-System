import { prisma } from './prisma'
import { THAI_PROVINCES } from './options'

export const MASTER_CATEGORIES = [
  { key: 'PRODUCT_TYPE', label: 'ประเภทสินค้า' },
  { key: 'PROVINCE', label: 'จังหวัด' },
  { key: 'COLOR', label: 'สี' },
  { key: 'EQUIPMENT_ITEM', label: 'รายการอุปกรณ์ (เคลม)' },
] as const

export type MasterCategory = (typeof MASTER_CATEGORIES)[number]['key']

export function categoryLabel(key: string): string {
  return MASTER_CATEGORIES.find((c) => c.key === key)?.label ?? key
}
export function isCategory(key: string): key is MasterCategory {
  return MASTER_CATEGORIES.some((c) => c.key === key)
}

// Active values for a category (for dropdowns).
export async function getMasterValues(category: MasterCategory): Promise<string[]> {
  const rows = await prisma.masterOption.findMany({
    where: { category, active: true },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
  })
  return rows.map((r) => r.value)
}

// Options for the job form dropdowns, with safe fallbacks if master data is empty.
export async function getJobFormOptions(): Promise<{ productTypes: string[]; provinces: string[] }> {
  const [pt, prov] = await Promise.all([getMasterValues('PRODUCT_TYPE'), getMasterValues('PROVINCE')])
  const provinces = prov.length ? prov : [...THAI_PROVINCES]
  let productTypes = pt
  if (!productTypes.length) {
    const d = await prisma.job.findMany({ distinct: ['productType'], select: { productType: true }, orderBy: { productType: 'asc' } })
    productTypes = d.map((x) => x.productType).filter(Boolean)
  }
  return { productTypes, provinces }
}
