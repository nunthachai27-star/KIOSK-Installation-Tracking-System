import { prisma } from './prisma'

// ── ตรวจสอบความผิดปกติในคลัง (อ่านอย่างเดียว — ไม่แก้ไขข้อมูล) ─────────────────
// ชนิดที่ตรวจ:
//  PATTERN        : serial ในรุ่นเดียวกันรูปแบบต่างจากส่วนใหญ่ (อาจลงผิดรุ่น)
//  DUP_LOT        : Lot ซ้ำในรุ่นเดียวกัน
//  DUP_SERIAL     : serialNo ซ้ำข้ามชิ้น (คีย์ผิด/ลงซ้ำ)
//  MISSING_SERIAL : รุ่นที่ต้องมี serial แต่ชิ้นนั้นไม่มี serialNo
//  QTY            : จำนวนรับเข้า (receivedQty) ไม่ตรงกับจำนวนชิ้นจริง

export type AnomalyKind = 'PATTERN' | 'DUP_LOT' | 'DUP_SERIAL' | 'MISSING_SERIAL' | 'QTY'
export type Anomaly = {
  kind: AnomalyKind
  productId: string | null
  product: string          // "กลุ่ม ▸ รุ่น"
  lotCode: string | null
  count: number
  message: string
  sample: string | null
}
export type AnomalyReport = {
  checkedProducts: number
  checkedItems: number
  counts: Record<AnomalyKind, number>
  anomalies: Anomaly[]
}

// ลายเซ็นรูปแบบ serial: ยุบตัวอักษร/ตัวเลขที่ติดกันเป็นสัญลักษณ์เดียว
// "SW26EG000150" → "A9A9" , "315024366" → "9"  (ทนความยาวต่างกันในตระกูลเดียวกัน)
function sigOf(s: string): string {
  let out = '', last = ''
  for (const ch of s) {
    const c = /[0-9]/.test(ch) ? '9' : /[A-Za-z]/.test(ch) ? 'A' : ch
    if (c !== last) { out += c; last = c }
  }
  return out
}

export async function getStockAnomalies(): Promise<AnomalyReport> {
  const products = await prisma.stockProduct.findMany({
    where: { active: true },
    select: {
      id: true, group: true, name: true, serialized: true,
      lots: {
        select: {
          id: true, lotCode: true, receivedQty: true,
          items: { select: { serialNo: true, serialBMS: true } },
        },
      },
    },
  })

  const anomalies: Anomaly[] = []
  let checkedItems = 0
  const serialSeen = new Map<string, number>() // serialNo → จำนวนครั้งที่พบ (หาซ้ำข้ามคลัง)

  for (const p of products) {
    const label = `${p.group} ▸ ${p.name}`

    // นับ serialNo ทั้งคลัง (ไว้เช็คซ้ำหลังลูป)
    for (const lot of p.lots) for (const it of lot.items) {
      checkedItems++
      const sn = (it.serialNo ?? '').trim()
      if (sn) serialSeen.set(sn, (serialSeen.get(sn) ?? 0) + 1)
    }

    // (2) Lot ซ้ำในรุ่นเดียวกัน
    const lotCount = new Map<string, number>()
    for (const lot of p.lots) {
      const code = lot.lotCode.trim()
      lotCount.set(code, (lotCount.get(code) ?? 0) + 1)
    }
    for (const [code, n] of lotCount) if (n > 1) {
      anomalies.push({ kind: 'DUP_LOT', productId: p.id, product: label, lotCode: code, count: n, sample: null,
        message: `มี Lot "${code}" ซ้ำ ${n} อันในรุ่นเดียวกัน` })
    }

    // (5) จำนวนไม่ตรง + (4) ไม่มี serial (ต่อ Lot)
    for (const lot of p.lots) {
      if (lot.receivedQty > 0 && lot.receivedQty !== lot.items.length) {
        anomalies.push({ kind: 'QTY', productId: p.id, product: label, lotCode: lot.lotCode, count: lot.items.length, sample: null,
          message: `Lot "${lot.lotCode}" บันทึกรับ ${lot.receivedQty} แต่มีชิ้นจริง ${lot.items.length}` })
      }
      if (p.serialized) {
        const missing = lot.items.filter((it) => !(it.serialNo ?? '').trim()).length
        if (missing > 0) {
          anomalies.push({ kind: 'MISSING_SERIAL', productId: p.id, product: label, lotCode: lot.lotCode, count: missing, sample: null,
            message: `Lot "${lot.lotCode}" มี ${missing} ชิ้นไม่มี Serial (รุ่นนี้ต้องระบุ Serial)` })
        }
      }
    }

    // (1) serial ผิดแพทเทิร์นในรุ่น
    if (p.serialized) {
      const bySig = new Map<string, { count: number; sample: string; lots: Map<string, { count: number; sample: string }> }>()
      let totalSn = 0
      for (const lot of p.lots) for (const it of lot.items) {
        const sn = (it.serialNo ?? '').trim()
        if (!sn) continue
        totalSn++
        const sig = sigOf(sn)
        let g = bySig.get(sig)
        if (!g) { g = { count: 0, sample: sn, lots: new Map() }; bySig.set(sig, g) }
        g.count++
        let lg = g.lots.get(lot.lotCode)
        if (!lg) { lg = { count: 0, sample: sn }; g.lots.set(lot.lotCode, lg) }
        lg.count++
      }
      if (totalSn >= 5 && bySig.size >= 2) {
        const sigs = [...bySig.entries()].sort((a, b) => b[1].count - a[1].count)
        const [, dom] = sigs[0]
        // ต้องมีรูปแบบหลักชัดเจน (≥60%) ถึงจะฟันธงว่าที่เหลือผิดปกติ
        if (dom.count >= totalSn * 0.6) {
          for (const [, g] of sigs.slice(1)) {
            for (const [lotCode, info] of g.lots) {
              anomalies.push({ kind: 'PATTERN', productId: p.id, product: label, lotCode, count: info.count, sample: info.sample,
                message: `Lot "${lotCode}" มี ${info.count} ชิ้น Serial รูปแบบต่างจากส่วนใหญ่ในรุ่นนี้ (เช่น ${info.sample} · ส่วนใหญ่แบบ ${dom.sample}) — อาจลงผิดรุ่น` })
            }
          }
        }
      }
    }
  }

  // (3) serialNo ซ้ำข้ามชิ้น
  for (const [sn, n] of serialSeen) if (n > 1) {
    anomalies.push({ kind: 'DUP_SERIAL', productId: null, product: '(ข้ามรุ่น/ในคลัง)', lotCode: null, count: n, sample: sn,
      message: `Serial "${sn}" ซ้ำ ${n} ชิ้น` })
  }

  const order: AnomalyKind[] = ['PATTERN', 'DUP_LOT', 'DUP_SERIAL', 'MISSING_SERIAL', 'QTY']
  anomalies.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
  const counts = { PATTERN: 0, DUP_LOT: 0, DUP_SERIAL: 0, MISSING_SERIAL: 0, QTY: 0 } as Record<AnomalyKind, number>
  for (const a of anomalies) counts[a.kind]++

  return { checkedProducts: products.length, checkedItems, counts, anomalies }
}
