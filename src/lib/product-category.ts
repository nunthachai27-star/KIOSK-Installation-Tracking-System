// Normalize the free-text productType into a handful of asset categories so the
// product registry can answer "how many Kiosk / Mini Kiosk do we own" cleanly.
// Order matters: "Mini Kiosk" must be checked before "Kiosk" (it contains "kiosk").
export const PRODUCT_CATEGORIES = ['Kiosk', 'Mini Kiosk', 'ชุดปิดสิทธิ', 'รถเข็น', 'QR / Payment', 'IPD / Consent', 'อื่นๆ'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const CATEGORY_META: Record<ProductCategory, { color: string; bg: string; icon: string }> = {
  'Kiosk':         { color: '#1B5FD9', bg: '#E4EEFF', icon: '🖥️' },
  'Mini Kiosk':    { color: '#0B7C86', bg: '#DCF1F2', icon: '📟' },
  'ชุดปิดสิทธิ':      { color: '#6D28D9', bg: '#F3EEFF', icon: '🪪' },
  'รถเข็น':         { color: '#9A6B10', bg: '#FAF0D8', icon: '🛒' },
  'QR / Payment':  { color: '#157F4C', bg: '#E2F3EA', icon: '💳' },
  'IPD / Consent': { color: '#C2410C', bg: '#FFEDE1', icon: '📋' },
  'อื่นๆ':          { color: '#5A6B82', bg: '#EDF0F4', icon: '📦' },
}

export function productCategory(productType: string): ProductCategory {
  const s = (productType ?? '').toLowerCase()
  if (s.includes('mini') && s.includes('kiosk')) return 'Mini Kiosk'
  if (s.includes('kiosk')) return 'Kiosk'
  if (productType.includes('ปิดสิทธิ')) return 'ชุดปิดสิทธิ'
  if (productType.includes('รถเข็น')) return 'รถเข็น'
  if (/qr|payment|noncash|non-cash|qrcode/.test(s)) return 'QR / Payment'
  if (/consent|ipd|idp|paperless/.test(s)) return 'IPD / Consent'
  return 'อื่นๆ'
}
