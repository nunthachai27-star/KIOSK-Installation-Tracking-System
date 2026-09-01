import { prisma } from './prisma'

// รายงานคงเหลือตามประเภทสินค้า — อ่านอย่างเดียว
// ผูกอุปกรณ์ (ProductComponent) กับสินค้าในคลัง (StockProduct) ผ่านตาราง StockReportMap
// (แยกต่างหาก ไม่มี logic การตัด/คลังตัวใดอ่าน)

export type StockProductLite = { id: string; group: string; name: string; inStock: number }
export type ReportComponent = {
  id: string
  name: string
  quantity: number
  needsSerial: boolean
  stockProductId: string | null
  stockProductName: string | null
  group: string | null
  inStock: number | null
  suggestions: StockProductLite[]
}
export type StockReport = {
  productType: string
  components: ReportComponent[]
  totalInStock: number
  mappedCount: number
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[()\[\]．.·,\-_/\\]/g, ' ').replace(/\s+/g, '').trim()

// คงเหลือ (IN_STOCK) ต่อสินค้าในคลังแต่ละตัว
export async function stockProductCounts(): Promise<StockProductLite[]> {
  const rows = await prisma.$queryRaw<{ id: string; group: string; name: string; in_stock: bigint }[]>`
    SELECT p."id", p."group", p."name",
           count(i."id") FILTER (WHERE i."status" = 'IN_STOCK') AS in_stock
    FROM "StockProduct" p
    LEFT JOIN "StockLot" l ON l."productId" = p."id"
    LEFT JOIN "StockItem" i ON i."lotId" = l."id"
    WHERE p."active" = true
    GROUP BY p."id", p."group", p."name"
    ORDER BY p."group", p."name"`
  return rows.map((r) => ({ id: r.id, group: r.group, name: r.name, inStock: Number(r.in_stock) }))
}

// ประเภทสินค้าที่มีอุปกรณ์ (BOM) — ใช้เป็นตัวเลือกในรายงาน
export async function productTypesWithComponents(): Promise<string[]> {
  const rows = await prisma.productComponent.findMany({
    where: { active: true },
    distinct: ['productType'],
    select: { productType: true },
    orderBy: { productType: 'asc' },
  })
  return rows.map((r) => r.productType)
}

function suggest(compName: string, products: StockProductLite[]): StockProductLite[] {
  const c = norm(compName)
  if (!c) return []
  const hits = products.filter((p) => {
    const n = norm(p.name)
    return n === c || n.includes(c) || c.includes(n)
  })
  // เรียงตรงเป๊ะก่อน แล้วตามคงเหลือมาก→น้อย
  return hits
    .sort((a, b) => (norm(b.name) === c ? 1 : 0) - (norm(a.name) === c ? 1 : 0) || b.inStock - a.inStock)
    .slice(0, 4)
}

export async function buildStockReport(productType: string): Promise<StockReport> {
  const [components, products] = await Promise.all([
    prisma.productComponent.findMany({
      where: { productType, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, quantity: true, needsSerial: true },
    }),
    stockProductCounts(),
  ])
  const byId = new Map(products.map((p) => [p.id, p]))
  const maps = components.length
    ? await prisma.stockReportMap.findMany({ where: { componentId: { in: components.map((c) => c.id) } } })
    : []
  const mapByComp = new Map(maps.map((m) => [m.componentId, m.stockProductId]))

  let totalInStock = 0
  let mappedCount = 0
  const rows: ReportComponent[] = components.map((c) => {
    const sp = mapByComp.get(c.id)
    const prod = sp ? byId.get(sp) ?? null : null
    if (prod) { mappedCount++; totalInStock += prod.inStock }
    return {
      id: c.id,
      name: c.name,
      quantity: c.quantity,
      needsSerial: c.needsSerial,
      stockProductId: prod?.id ?? null,
      stockProductName: prod?.name ?? null,
      group: prod?.group ?? null,
      inStock: prod ? prod.inStock : null,
      suggestions: prod ? [] : suggest(c.name, products),
    }
  })
  return { productType, components: rows, totalInStock, mappedCount }
}
