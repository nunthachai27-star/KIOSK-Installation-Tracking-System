import { prisma } from './prisma'
import { THAI_PROVINCES } from './options'

export const MASTER_CATEGORIES = [
  { key: 'PRODUCT_TYPE', label: 'ประเภทสินค้า' },
  { key: 'PROVINCE', label: 'จังหวัด' },
  { key: 'COLOR', label: 'สี' },
] as const

export type MasterCategory = (typeof MASTER_CATEGORIES)[number]['key']

// Claim equipment lists are stored per product type: category = `EQUIPMENT_ITEM:<productType>`.
export const EQUIPMENT_PREFIX = 'EQUIPMENT_ITEM:'
export function isEquipmentCategory(key: string): boolean {
  return key.startsWith(EQUIPMENT_PREFIX) && key.length > EQUIPMENT_PREFIX.length
}
export function equipmentCategory(productType: string): string {
  return EQUIPMENT_PREFIX + productType
}

export function categoryLabel(key: string): string {
  if (isEquipmentCategory(key)) return `รายการอุปกรณ์ · ${key.slice(EQUIPMENT_PREFIX.length)}`
  return MASTER_CATEGORIES.find((c) => c.key === key)?.label ?? key
}
export function isCategory(key: string): key is MasterCategory {
  return MASTER_CATEGORIES.some((c) => c.key === key)
}
// Categories that the generic option editor/API may manage: fixed ones + per-type equipment.
export function isManageableCategory(key: string): boolean {
  return isCategory(key) || isEquipmentCategory(key)
}

// Claim equipment options grouped by product type (for the claim form).
export async function getEquipmentByProduct(): Promise<Record<string, string[]>> {
  const rows = await prisma.masterOption.findMany({
    where: { category: { startsWith: EQUIPMENT_PREFIX }, active: true },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
  })
  const map: Record<string, string[]> = {}
  for (const r of rows) { const pt = r.category.slice(EQUIPMENT_PREFIX.length); (map[pt] ??= []).push(r.value) }
  return map
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
