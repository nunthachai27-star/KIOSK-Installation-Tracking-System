// ค่าที่รับจากเครื่องวัดไขมัน/องค์ประกอบร่างกาย — เก็บถาวรในฐานข้อมูล (ตาราง FatReading)
// รูปแบบ payload ยังไม่แน่นอน (รอ API gateway) → เก็บ raw ครบ + parse ค่าที่พบเป็น key/value แบบ best-effort
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type FatMetrics = Record<string, number>

export type FatReading = {
  id: string
  at: string                 // ISO timestamp ที่รับเข้า
  device: string | null      // ชื่อ/รหัสเครื่องที่ส่งค่ามา
  name: string | null        // ชื่อผู้วัด (ถ้าเสียบบัตร)
  idcard: string | null      // เลขบัตรประชาชนผู้วัด
  metrics: FatMetrics        // ค่าที่ parse ได้ (weight/bmi/bodyFat/...)
  raw: unknown               // payload ดิบที่เครื่อง/gateway ส่งมา
}

// นิยามค่าที่เครื่องวัดไขมัน/องค์ประกอบร่างกายมักส่งมา (label/หน่วย + คำที่ใช้เดา key)
// ใช้ร่วมกันทั้งฝั่ง parse (server) และฝั่งแสดงผล (dashboard/report) เพื่อให้ตรงกัน
// ลำดับสำคัญ: ค่าเฉพาะเจาะจงต้องมาก่อนค่ากว้าง (เช่น visceralFat มาก่อน bodyFat กัน "fat" ไปคว้าผิด)
export const FAT_METRICS: { key: string; label: string; unit: string; pats: RegExp[] }[] = [
  { key: 'weight',       label: 'น้ำหนัก',              unit: 'kg',   pats: [/body_?weight/i, /\bweight\b/i, /\bwt\b/i, /体重/] },
  { key: 'height',       label: 'ส่วนสูง',              unit: 'cm',   pats: [/\bheight\b/i, /\bht\b/i, /身高/] },
  { key: 'bmi',          label: 'BMI',                  unit: '',     pats: [/\bbmi\b/i, /body_?mass_?index/i] },
  { key: 'visceralFat',  label: 'ไขมันช่องท้อง',        unit: 'ระดับ', pats: [/visceral/i, /\bvfl\b/i, /\bvfr\b/i, /\buvi\b/i, /内脏/] },
  { key: 'bodyFat',      label: 'ไขมันในร่างกาย',        unit: '%',    pats: [/body_?fat/i, /fat_?(rate|percent|percentage|ratio|pct|value)/i, /\bbfr\b/i, /\bpbf\b/i, /\bfatp\b/i, /脂肪/, /\bfat\b/i] },
  { key: 'fatMass',      label: 'มวลไขมัน',             unit: 'kg',   pats: [/fat_?mass/i, /\bfatkg\b/i] },
  { key: 'muscle',       label: 'มวลกล้ามเนื้อ',         unit: 'kg',   pats: [/muscle/i, /\bskm\b/i, /\bsmm\b/i, /lean/i, /肌肉/] },
  { key: 'water',        label: 'น้ำในร่างกาย',          unit: '%',    pats: [/body_?water/i, /water/i, /moisture/i, /hydration/i, /\btbw\b/i, /水分/] },
  { key: 'protein',      label: 'โปรตีน',               unit: '%',    pats: [/protein/i, /蛋白/] },
  { key: 'boneMass',     label: 'มวลกระดูก',            unit: 'kg',   pats: [/bone_?mass/i, /\bbone\b/i, /骨量/, /骨/] },
  { key: 'bmr',          label: 'เผาผลาญพื้นฐาน (BMR)',  unit: 'kcal', pats: [/\bbmr\b/i, /basal/i, /base_?metab/i, /basmetab/i, /基础代谢/] },
  { key: 'metabolicAge', label: 'อายุร่างกาย',          unit: 'ปี',   pats: [/metabolic_?age/i, /body_?age/i, /phys.*age/i, /\bage\b/i, /年龄/] },
]

// บันทึกค่าที่รับเข้า (ลงฐานข้อมูล — อยู่ถาวรแม้ deploy ใหม่)
export async function saveFatReading(fields: {
  device: string | null; name: string | null; idcard: string | null
  metrics: FatMetrics; raw: unknown
}): Promise<void> {
  await prisma.fatReading.create({
    data: {
      device: fields.device, name: fields.name, idcard: fields.idcard,
      metrics: (fields.metrics ?? {}) as Prisma.InputJsonValue,
      raw: (fields.raw ?? undefined) as Prisma.InputJsonValue,
    },
  })
}

// อ่านค่าที่รับมา (ล่าสุดอยู่บน)
export async function listFatReadings(limit = 300): Promise<FatReading[]> {
  const rows = await prisma.fatReading.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    device: r.device,
    name: r.name,
    idcard: r.idcard,
    metrics: (r.metrics && typeof r.metrics === 'object' && !Array.isArray(r.metrics) ? r.metrics : {}) as FatMetrics,
    raw: r.raw,
  }))
}

export async function clearFatReadings(): Promise<void> {
  await prisma.fatReading.deleteMany({})
}

const nnum = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  // บางรุ่นส่งเป็นสตริง เช่น "18.5%" / "70.2kg" / "22.1#..." → ดึงเฉพาะตัวเลขนำหน้า
  if (typeof v === 'string') { const m = v.match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null }
  return null
}

// แผ่ object/array ซ้อนหลายชั้น → คู่ key/value ไว้สแกนหาค่า
function flatten(input: unknown): [string, unknown][] {
  const out: [string, unknown][] = []
  const walk = (obj: unknown, depth: number) => {
    if (!obj || typeof obj !== 'object' || depth > 4) return
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push([k, v])
      if (v && typeof v === 'object') walk(v, depth + 1)
    }
  }
  walk(input, 0)
  return out
}

// เดาค่าองค์ประกอบร่างกายจาก payload (best-effort — เครื่องแต่ละรุ่นตั้งชื่อ key ต่างกัน)
// วิธี: ไล่ทีละคู่ key/value แล้วจับให้ metric "ตัวแรกในลำดับ" ที่ pattern ตรง — key หนึ่งใช้ครั้งเดียว
export function parseFat(raw: unknown): FatMetrics {
  const pairs = flatten(raw)
  const metrics: FatMetrics = {}
  for (const [k, v] of pairs) {
    const n = nnum(v)
    if (n == null) continue
    const m = FAT_METRICS.find((def) => def.pats.some((p) => p.test(k)))
    if (m && metrics[m.key] == null) metrics[m.key] = n
  }
  return metrics
}

// ดึง "ชื่อ/รหัสเครื่อง" จาก payload (best-effort) — เผื่อวัดจากหลายเครื่องจะได้แยกออก
export function parseDevice(raw: unknown): string | null {
  const pairs = flatten(raw)
  const pickStr = (pats: RegExp[]): string | null => {
    for (const [k, v] of pairs) {
      if (pats.some((p) => p.test(k)) && typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  }
  // ชื่อ/รุ่นก่อน → แล้วค่อยรหัสเครื่อง
  return (
    pickStr([/devicename/i, /device_name/i, /\bmodel\b/i, /machine/i]) ||
    pickStr([/device[_-]?id/i, /\bdevice\b/i, /\bsn\b/i, /serial/i, /\bimei\b/i, /\bmac\b/i])
  )
}

// ดึง "ชื่อ + เลขบัตร" ของผู้วัด (จาก payload เช่น sfz.idnumber / name) — best-effort
export function parsePerson(raw: unknown): { name: string | null; idcard: string | null } {
  const pairs = flatten(raw)
  const pick = (pats: RegExp[], exclude?: RegExp): string | null => {
    for (const [k, v] of pairs) {
      if (exclude && exclude.test(k)) continue
      if (pats.some((p) => p.test(k)) && typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  }
  const idcard = pick([/idnumber/i, /id[_-]?card/i, /card[_-]?no/i, /\bcid\b/i, /\bpid\b/i, /idno/i, /身份/])
  // ชื่อ: จับ key ที่มี name แต่ไม่ใช่ของเครื่อง/ไฟล์
  const name = pick([/realname/i, /full_?name/i, /patient/i, /\bname\b/i, /\bxm\b/i, /姓名/], /device|file|table|db|host|app/i)
  return { name, idcard }
}
