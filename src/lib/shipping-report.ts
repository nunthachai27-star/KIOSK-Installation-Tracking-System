import { prisma } from './prisma'

// ฟอร์ม "รายการส่งของ / ค่าขนส่ง" — ดึงเฉพาะงานที่จัดส่งด้วยวิธีที่กำหนด
// (ค่าเริ่มต้น: ขนส่งลุงแดงโลจิสติก) แยกเป็นรายเดือนตาม "วันที่ขนออก" (shippedDate)
export const DEFAULT_SHIP_METHOD = 'ขนส่งลุงแดงโลจิสติก'

const TH_OFFSET_MS = 7 * 60 * 60 * 1000 // Asia/Bangkok

export type ShipRow = {
  hospital: string
  province: string
  item: string          // รายการ = ประเภทสินค้าของงาน
  qty: number           // จำนวน = จำนวนในข้อมูลงาน
  estCost: number | null // ประมาณการค่าขนส่ง (ถ้าไม่กรอกไว้ = null → เว้นให้กรอกเอง)
  shippedDate: Date
  // rowspan สำหรับรวมช่องในตาราง (คำนวณไว้ให้ทั้ง HTML และ Excel ใช้ร่วมกัน)
  provinceSpan: number  // > 0 = แถวแรกของกลุ่ม (วันเดียวกัน+จังหวัดเดียวกัน) ให้ render ช่อง จังหวัด/วันที่/จำนวนรถ
  hospitalSpan: number  // > 0 = แถวแรกของบล็อกหน่วยงานเดียวกันในกลุ่มนั้น
}

export type ShipReport = {
  method: string
  year: number          // ค.ศ.
  month: number         // 0-11
  rows: ShipRow[]
  totalQty: number
  totalEst: number
  hasEst: boolean
  months: { year: number; month: number }[] // เดือนที่มีข้อมูล (ใหม่→เก่า) สำหรับตัวเลือก
}

const dayKey = (d: Date) => {
  const t = new Date(d.getTime() + TH_OFFSET_MS)
  return `${t.getUTCFullYear()}-${t.getUTCMonth()}-${t.getUTCDate()}`
}

export async function getShippingCostReport(
  ceYear: number,
  month: number,
  method: string = DEFAULT_SHIP_METHOD,
): Promise<ShipReport> {
  // ทุกงานที่ใช้วิธีจัดส่งนี้ และมีวันที่ขนออก (ไม่รวมงานที่อยู่ในถังขยะ)
  const all = await prisma.deliveryRecord.findMany({
    where: { method, shippedDate: { not: null }, job: { deletedAt: null } },
    select: {
      shippedDate: true,
      estimatedCost: true,
      job: { select: { productType: true, quantity: true, province: true, hospital: { select: { name: true } } } },
    },
  })

  // เดือนที่มีข้อมูล (ตาม Asia/Bangkok) สำหรับ dropdown
  const monthSet = new Map<string, { year: number; month: number }>()
  for (const d of all) {
    if (!d.shippedDate) continue
    const t = new Date(d.shippedDate.getTime() + TH_OFFSET_MS)
    monthSet.set(`${t.getUTCFullYear()}-${t.getUTCMonth()}`, { year: t.getUTCFullYear(), month: t.getUTCMonth() })
  }
  const months = [...monthSet.values()].sort((a, b) => (b.year - a.year) || (b.month - a.month))

  // ช่วงเดือนที่เลือก (แปลงขอบเขตเดือนตามเวลาไทยเป็น instant UTC)
  const start = new Date(Date.UTC(ceYear, month, 1) - TH_OFFSET_MS)
  const end = new Date(Date.UTC(ceYear, month + 1, 1) - TH_OFFSET_MS)

  const inMonth = all.filter((d) => d.shippedDate && d.shippedDate >= start && d.shippedDate < end)

  // เรียง: วันที่ → จังหวัด → หน่วยงาน → รายการ
  inMonth.sort((a, b) => {
    const ta = a.shippedDate!.getTime(), tb = b.shippedDate!.getTime()
    if (ta !== tb) return ta - tb
    const pa = a.job.province || '', pb = b.job.province || ''
    if (pa !== pb) return pa.localeCompare(pb, 'th')
    const ha = a.job.hospital?.name || '', hb = b.job.hospital?.name || ''
    if (ha !== hb) return ha.localeCompare(hb, 'th')
    return (a.job.productType || '').localeCompare(b.job.productType || '', 'th')
  })

  const rows: ShipRow[] = inMonth.map((d) => ({
    hospital: d.job.hospital?.name || '-',
    province: d.job.province || '-',
    item: d.job.productType || '-',
    qty: d.job.quantity ?? 0,
    estCost: d.estimatedCost != null ? Number(d.estimatedCost) : null,
    shippedDate: d.shippedDate!,
    provinceSpan: 0,
    hospitalSpan: 0,
  }))

  // คำนวณ rowspan: กลุ่ม = วันเดียวกัน+จังหวัดเดียวกัน ; บล็อกย่อย = หน่วยงานเดียวกันในกลุ่ม
  for (let i = 0; i < rows.length;) {
    const gKey = `${dayKey(rows[i].shippedDate)}|${rows[i].province}`
    let j = i
    while (j < rows.length && `${dayKey(rows[j].shippedDate)}|${rows[j].province}` === gKey) j++
    rows[i].provinceSpan = j - i
    // ภายในกลุ่ม แบ่งบล็อกตามหน่วยงาน
    for (let k = i; k < j;) {
      const h = rows[k].hospital
      let m = k
      while (m < j && rows[m].hospital === h) m++
      rows[k].hospitalSpan = m - k
      k = m
    }
    i = j
  }

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalEst = rows.reduce((s, r) => s + (r.estCost ?? 0), 0)
  const hasEst = rows.some((r) => r.estCost != null)

  return { method, year: ceYear, month, rows, totalQty, totalEst, hasEst, months }
}
