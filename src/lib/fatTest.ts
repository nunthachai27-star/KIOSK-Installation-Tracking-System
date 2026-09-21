// ค่าที่รับจากเครื่องวัดไขมัน/องค์ประกอบร่างกาย — เก็บถาวรในฐานข้อมูล (ตาราง FatReading)
// จูนตามเครื่องจริง Shanghe X18 series (payload ห่อใน datas[0]) + เผื่อรุ่นอื่นด้วย fuzzy fallback
// เก็บ raw ครบเสมอ; parse ค่าที่พบเป็น key/value พร้อมกรองช่วงค่าให้สมเหตุสมผล
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type FatMetrics = Record<string, number>

export type FatReading = {
  id: string
  at: string                 // ISO timestamp ที่รับเข้า
  device: string | null      // ชื่อ/รหัสเครื่องที่ส่งค่ามา
  name: string | null        // ชื่อผู้วัด
  idcard: string | null      // เลขบัตรประชาชนผู้วัด (ถ้ามี)
  metrics: FatMetrics        // ค่าที่ parse ได้ (weight/bmi/bodyFat/...)
  raw: unknown               // payload ดิบที่เครื่อง/gateway ส่งมา
}

// นิยามค่าที่แสดง (label/หน่วย + ช่วงค่าที่ยอมรับ) — ใช้ร่วมทั้ง server (parse/กรอง) และ UI (แสดง/เรียง)
// pats = คำเดาสำหรับเครื่องรุ่นอื่นที่ไม่มีใน KEY_MAP (fallback)
export const FAT_METRICS: { key: string; label: string; unit: string; min?: number; max?: number; pats?: RegExp[] }[] = [
  { key: 'weight',       label: 'น้ำหนัก',              unit: 'kg',    min: 2,   max: 400,  pats: [/body_?weight/i, /\bweight\b/i, /\bwt\b/i, /体重/] },
  { key: 'height',       label: 'ส่วนสูง',              unit: 'cm',    min: 50,  max: 250,  pats: [/\bheight\b/i, /身高/] },
  { key: 'bmi',          label: 'BMI',                  unit: '',      min: 5,   max: 80,   pats: [/\bbmi\b/i] },
  { key: 'bodyFat',      label: 'ไขมันในร่างกาย',        unit: '%',     min: 1,   max: 75,   pats: [/body_?fat/i, /\bpbf\b/i, /\bbfr\b/i, /脂肪率/] },
  { key: 'fatMass',      label: 'มวลไขมัน',             unit: 'kg',    min: 0,   max: 200 },
  { key: 'subcutFat',    label: 'ไขมันใต้ผิวหนัง',       unit: '%',     min: 0,   max: 75 },
  { key: 'visceralFat',  label: 'ไขมันช่องท้อง',         unit: 'ระดับ', min: 1,   max: 60,   pats: [/visceral/i] },
  { key: 'muscleRate',   label: 'กล้ามเนื้อ',            unit: '%',     min: 5,   max: 95 },
  { key: 'muscle',       label: 'มวลกล้ามเนื้อ',         unit: 'kg',    min: 1,   max: 120,  pats: [/skeletal/i, /muscle_?mass/i, /肌肉/] },
  { key: 'fatFreeMass',  label: 'มวลไร้ไขมัน',           unit: 'kg',    min: 1,   max: 150 },
  { key: 'water',        label: 'น้ำในร่างกาย',          unit: '%',     min: 5,   max: 90,   pats: [/body_?water/i, /moisture/i, /水分/] },
  { key: 'protein',      label: 'โปรตีน',               unit: 'kg',    min: 0.5, max: 40,   pats: [/protein/i, /蛋白/] },
  { key: 'mineral',      label: 'แร่ธาตุ',              unit: 'kg',    min: 0.3, max: 15 },
  { key: 'boneMass',     label: 'มวลกระดูก',            unit: 'kg',    min: 0.3, max: 10,   pats: [/bone_?mass/i] },
  { key: 'bmr',          label: 'เผาผลาญพื้นฐาน (BMR)',  unit: 'kcal',  min: 300, max: 5000, pats: [/\bbmr\b/i, /basal/i] },
  { key: 'metabolicAge', label: 'อายุร่างกาย',          unit: 'ปี',    min: 5,   max: 120,  pats: [/metabolic_?age/i, /body_?age/i] },
  { key: 'bodyScore',    label: 'คะแนนสุขภาพ',          unit: 'คะแนน', min: 0,   max: 100 },
  { key: 'obesity',      label: 'ระดับความอ้วน',         unit: '%',     min: 0,   max: 400 },
  { key: 'whr',          label: 'เอว/สะโพก',            unit: 'WHR',   min: 0.3, max: 2 },
]

// คีย์จริงของเครื่อง (พิมพ์เล็ก) → metric key ของเรา (แม่นสุด ไม่ขึ้นกับลำดับ/คีย์อ้างอิงที่พ่วงมา)
// อ้างอิงจาก Shanghe X18_5: fatRate/waterRate/muscleRate/vfal/skeletalMuscle/fatFree/bone/bmr/bodyAge ...
const KEY_MAP: Record<string, string> = {
  weight: 'weight', bodyweight: 'weight', wt: 'weight',
  height: 'height',
  bmi: 'bmi',
  fatrate: 'bodyFat', bodyfat: 'bodyFat', bodyfatrate: 'bodyFat', pbf: 'bodyFat',
  fat: 'fatMass', fatmass: 'fatMass',
  fatsubcutrate: 'subcutFat', subcutaneousfat: 'subcutFat',
  vfal: 'visceralFat', vfl: 'visceralFat', visceralfat: 'visceralFat',
  musclerate: 'muscleRate',
  skeletalmuscle: 'muscle', musclemass: 'muscle', muscle: 'muscle', smm: 'muscle',
  fatfree: 'fatFreeMass', fatfreemass: 'fatFreeMass', ffm: 'fatFreeMass',
  waterrate: 'water', bodywater: 'water', tbw: 'water',
  protein: 'protein',
  mineral: 'mineral',
  bone: 'boneMass', bonemass: 'boneMass',
  bmr: 'bmr',
  bodyage: 'metabolicAge', metabolicage: 'metabolicAge',
  bodyscore: 'bodyScore',
  obesity: 'obesity',
  whr: 'whr',
}

// คีย์ที่ไม่ใช่ค่าองค์ประกอบร่างกาย — กันไม่ให้ fuzzy ไปคว้า (เช่น age จริงของคน, sex, เวลา, id)
const BLOCK = new Set([
  'age', 'sex', 'userid', 'measuretime', 'recordno', 'logintype', 'bmitype', 'unitno', 'unitname',
  'birthday', 'address', 'nation', 'startdate', 'enddate', 'department', 'doctorid', 'doctorname',
  'name', 'deviceno', 'devicemodel', 'macaddr', 'impedance', 'dci', 'walking', 'swim', 'aerobic', 'jogging',
])
// คีย์ลงท้าย _n / _s (+เลข) = ค่าอ้างอิง/สถานะ, และ *Adjus = ค่าปรับ — ไม่ใช่ผลวัด
const EXCLUDE_SUFFIX = /(_(n|s)\d*|adjus)$/i

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
  // บางค่าเป็นสตริง เช่น "36.4" / "18.5%" → ดึงตัวเลขนำหน้า (ข้ามช่วง/ข้อความ)
  if (typeof v === 'string') { const m = v.match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null }
  return null
}

// แผ่ object/array ซ้อนหลายชั้น (รวม datas[0]) → คู่ key/value ไว้สแกนหาค่า
function flatten(input: unknown): [string, unknown][] {
  const out: [string, unknown][] = []
  const walk = (obj: unknown, depth: number) => {
    if (!obj || typeof obj !== 'object' || depth > 5) return
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push([k, v])
      if (v && typeof v === 'object') walk(v, depth + 1)
    }
  }
  walk(input, 0)
  return out
}

// parse ค่าองค์ประกอบร่างกายจาก payload
//  pass 1: จับคู่คีย์แบบตรงตัว (KEY_MAP) — แม่น ไม่ขึ้นกับลำดับ/คีย์อ้างอิงที่พ่วงมา
//  pass 2: เดาจากชื่อคีย์ (pats) เฉพาะค่าที่ยังไม่ได้ — เผื่อเครื่องรุ่นอื่น
//  ทุกค่าใส่ตัวกรองช่วง (min/max) กันค่าขยะช่วงเริ่มวัด เช่น height 2.0 / bmi 169250
export function parseFat(raw: unknown): FatMetrics {
  const pairs = flatten(raw)
  const defByKey = new Map(FAT_METRICS.map((m) => [m.key, m]))
  const metrics: FatMetrics = {}
  const setVal = (mk: string, n: number) => {
    const d = defByKey.get(mk)
    if (d) { if (d.min != null && n < d.min) return; if (d.max != null && n > d.max) return }
    if (metrics[mk] == null) metrics[mk] = n
  }
  // pass 1 — exact
  for (const [k, v] of pairs) {
    const kl = k.toLowerCase()
    if (EXCLUDE_SUFFIX.test(kl)) continue
    const mk = KEY_MAP[kl]
    if (!mk) continue
    const n = nnum(v); if (n != null) setVal(mk, n)
  }
  // pass 2 — fuzzy fallback
  for (const [k, v] of pairs) {
    const kl = k.toLowerCase()
    if (EXCLUDE_SUFFIX.test(kl) || BLOCK.has(kl) || KEY_MAP[kl]) continue
    const n = nnum(v); if (n == null) continue
    const m = FAT_METRICS.find((def) => def.pats?.some((p) => p.test(k)) && metrics[def.key] == null)
    if (m) setVal(m.key, n)
  }
  return metrics
}

// ดึง "ชื่อ/รหัสเครื่อง" — รวมรุ่น + ท้ายรหัสเครื่อง เพื่อแยกเครื่องที่รุ่นเดียวกัน
// Shanghe: deviceModel="X18_5", deviceNo="G2510...989" → "X18_5 · 300989"
export function parseDevice(raw: unknown): string | null {
  const pairs = flatten(raw)
  const get = (re: RegExp): string | null => {
    for (const [k, v] of pairs) if (re.test(k) && typeof v === 'string' && v.trim()) return v.trim()
    return null
  }
  const model = get(/devicemodel/i) || get(/device_?name/i) || get(/\bmodel\b/i) || get(/machine/i)
  const no = get(/deviceno/i) || get(/device[_-]?id/i) || get(/\bsn\b/i) || get(/serial/i) || get(/macaddr/i) || get(/\bmac\b/i)
  if (model && no) return `${model} · ${no.slice(-6)}`
  return model || no || null
}

// ดึง "ชื่อ + เลขบัตร" ของผู้วัด (best-effort) — Shanghe ส่งชื่อใน datas[].name (ไม่มีเลขบัตร)
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
  const name = pick([/realname/i, /full_?name/i, /patient/i, /\bname\b/i, /姓名/], /device|unit|file|table|db|host|app|user/i)
  return { name, idcard }
}
