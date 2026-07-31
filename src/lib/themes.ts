// Available colour themes. `key` maps to <html data-theme="key"> + CSS rules in
// globals.css. Default (null / 'orange') = ส้ม BMS.
export type ThemeKey = 'orange' | 'ocean' | 'teal' | 'violet' | 'sand' | 'rose' | 'indigo' | 'forest' | 'cyan' | 'graphite'

export const THEMES: { key: ThemeKey; label: string; swatch: string }[] = [
  { key: 'orange', label: 'ส้ม BMS', swatch: '#EA580C' },
  { key: 'ocean', label: 'น้ำเงินธุรกิจ', swatch: '#1B5FD9' },
  { key: 'teal', label: 'เขียวมิ้นต์', swatch: '#0F766E' },
  { key: 'violet', label: 'ม่วงหรู', swatch: '#6D28D9' },
  { key: 'sand', label: 'ครีมอุ่น', swatch: '#B4530A' },
  { key: 'rose', label: 'ชมพูโรส', swatch: '#DB2777' },
  { key: 'indigo', label: 'คราม', swatch: '#4F46E5' },
  { key: 'forest', label: 'เขียวป่า', swatch: '#15803D' },
  { key: 'cyan', label: 'ฟ้าคราม', swatch: '#0891B2' },
  { key: 'graphite', label: 'กราไฟต์', swatch: '#475569' },
]

export const THEME_KEYS = THEMES.map((t) => t.key)
export const DEFAULT_THEME: ThemeKey = 'orange'

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === 'string' && (THEME_KEYS as string[]).includes(v)
}

// Dynamic background styles (applied via <html data-bg="...">).
export type BgKey = 'plain' | 'aurora' | 'mesh' | 'time'
export const BACKGROUNDS: { key: BgKey; label: string; hint: string }[] = [
  { key: 'plain', label: 'เรียบ', hint: 'พื้นสีเดียว' },
  { key: 'aurora', label: 'Aurora', hint: 'ก้อนสีเคลื่อนไหวช้าๆ' },
  { key: 'mesh', label: 'Mesh', hint: 'ไล่เฉดสีนิ่งๆ' },
  { key: 'time', label: 'ตามช่วงเวลา', hint: 'อุ่น/เย็นตามเวลา' },
]
export const BG_KEYS = BACKGROUNDS.map((b) => b.key)
export const DEFAULT_BG: BgKey = 'plain'

export function isBgKey(v: unknown): v is BgKey {
  return typeof v === 'string' && (BG_KEYS as string[]).includes(v)
}
