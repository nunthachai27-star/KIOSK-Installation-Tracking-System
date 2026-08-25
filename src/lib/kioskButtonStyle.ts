// ── ตัวตรวจสไตล์ปุ่ม Kiosk (server-side, authoritative) ──────────────────────
// รับ cfg ที่ผู้ใช้ส่งมา แล้วคืนอ็อบเจกต์ที่ "สะอาด" — เฉพาะคีย์ที่รู้จัก ชนิดถูกต้อง
// และค่าถูกบีบให้อยู่ในช่วงที่ปลอดภัยเท่านั้น. กันการยัดข้อมูลแปลกปลอม/ขนาดบวม/สคริปต์.
// ใช้ตอนรับ POST ก่อนบันทึกลงฐานข้อมูล — ฝั่ง client มีสำเนาไว้พรีวิวแต่ไม่ถือเป็นหลัก.

type Dict = Record<string, unknown>

const num = (v: unknown, min: number, max: number, def: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100))
}
const hex = (v: unknown, def: string): string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : def
const pick = <T extends string>(v: unknown, set: readonly T[], def: T): T =>
  set.includes(v as T) ? (v as T) : def
const bit = (v: unknown): 0 | 1 => (v ? 1 : 0)

const DECOS = ['none', 'bar', 'block', 'topbar', 'ribbon', 'glass', 'sweep', 'ring',
  'badge', 'slant', 'bottombar', 'frame', 'dots', 'ticket', 'sidebars', 'cut', 'arc',
  'stripes', 'grid', 'topbottom', 'tab', 'rings', 'inset'] as const

/** คืนสไตล์ที่ผ่านการตรวจแล้ว (พร้อม JSON.stringify เก็บ). */
export function cleanStyle(input: unknown): Record<string, unknown> {
  const c: Dict = input && typeof input === 'object' ? (input as Dict) : {}
  return {
    accent: hex(c.accent, '#00897B'),
    autofill: bit(c.autofill),
    font: pick(c.font, ['sarabun', 'kanit', 'prompt', 'mitr'], 'sarabun'),
    deco: pick(c.deco, DECOS, 'none'),
    tone: pick(c.tone, ['light', 'solid', 'flat', 'dark'], 'light'),
    dir: pick(c.dir, ['v', 'd', 'h'], 'v'),
    icon: pick(c.icon, ['cross', 'dot', 'arrow', 'none'], 'cross'),
    textMode: pick(c.textMode, ['auto', 'dark', 'light', 'custom'], 'auto'),
    textColor: hex(c.textColor, '#10233F'),
    borderColor: pick(c.borderColor, ['auto', 'accent', 'white', 'dark'], 'auto'),
    align: pick(c.align, ['center', 'left', 'right'], 'center'),
    stroke: pick(c.stroke, ['none', 'light', 'dark'], 'none'),
    subPos: pick(c.subPos, ['below', 'above'], 'below'),
    subColor: hex(c.subColor, '#5E7290'),
    fillA: hex(c.fillA, '#ffffff'),
    fillB: hex(c.fillB, '#ffffff'),
    alpha: num(c.alpha, 15, 100, 100),
    decoSize: num(c.decoSize, 40, 180, 100),
    padL: num(c.padL, 20, 400, 56),
    padR: num(c.padR, 20, 400, 56),
    padY: num(c.padY, 10, 110, 46),
    radius: num(c.radius, 0, 131, 40),
    gloss: num(c.gloss, 0, 100, 0),
    shadow: num(c.shadow, 0, 100, 52),
    borderW: num(c.borderW, 0, 16, 2),
    maxPt: num(c.maxPt, 40, 150, 112),
    textX: num(c.textX, -380, 380, 0),
    textY: num(c.textY, -110, 110, 0),
    subRatio: num(c.subRatio, 22, 80, 42),
    subGap: num(c.subGap, 0, 46, 12),
    innerRing: bit(c.innerRing),
    borderDash: bit(c.borderDash),
    shadowHard: bit(c.shadowHard),
    shadowGlow: bit(c.shadowGlow),
    subAuto: bit(c.subAuto),
  }
}
