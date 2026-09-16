// ที่เก็บค่าทดสอบจากเครื่องวัดความดัน (ในหน่วยความจำ — สำหรับหน้าเดชบอร์ดทดสอบเท่านั้น)
// รีเซ็ตเมื่อรีสตาร์ท/ดีพลอย · เก็บล่าสุดสูงสุด 50 รายการ
export type BpReading = {
  id: string
  at: string                 // ISO timestamp ที่รับเข้า
  systolic: number | null    // ความดันตัวบน (SYS)
  diastolic: number | null   // ความดันตัวล่าง (DIA)
  pulse: number | null       // ชีพจร (Pulse)
  raw: unknown               // payload ดิบที่เครื่องส่งมา (ไว้ดู/แมปฟิลด์)
}

const MAX = 50
const store: BpReading[] = []

export function addBpReading(r: BpReading) {
  store.unshift(r)
  if (store.length > MAX) store.length = MAX
}
export function getBpReadings(): BpReading[] {
  return store
}
export function clearBpReadings() {
  store.length = 0
}

const nnum = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.trim()); return Number.isFinite(n) ? n : null }
  return null
}

// แผ่ object/array ซ้อนหนึ่งชั้น → คู่ key/value ไว้สแกนหาค่า
function flatten(input: unknown): [string, unknown][] {
  const out: [string, unknown][] = []
  const walk = (obj: unknown, depth: number) => {
    if (!obj || typeof obj !== 'object' || depth > 3) return
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push([k, v])
      if (v && typeof v === 'object') walk(v, depth + 1)
    }
  }
  walk(input, 0)
  return out
}

// เดาฟิลด์ SYS/DIA/Pulse จาก payload (best-effort — เครื่องแต่ละรุ่นตั้งชื่อ key ต่างกัน)
export function parseBp(raw: unknown): { systolic: number | null; diastolic: number | null; pulse: number | null } {
  const pairs = flatten(raw)
  const pick = (pats: RegExp[]): number | null => {
    for (const [k, v] of pairs) {
      if (pats.some((p) => p.test(k))) { const n = nnum(v); if (n != null) return n }
    }
    return null
  }
  return {
    systolic: pick([/sys/i, /high/i, /shrink/i, /sbp/i, /\bss\b/i, /收缩/, /gy|高压/i]),
    diastolic: pick([/dia/i, /\blow\b/i, /dbp/i, /\bsz\b/i, /舒张/, /dy|低压/i]),
    pulse: pick([/pulse/i, /heart/i, /\brate\b/i, /bpm/i, /心率/, /\bxl\b/i, /mb/i]),
  }
}
