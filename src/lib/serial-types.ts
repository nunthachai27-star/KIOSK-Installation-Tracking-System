import type { SerialType } from '@prisma/client'

// Client-safe (no prisma import): shared by the QC form, settings, and product-spec.
export const SERIAL_TYPE_LABELS: Record<SerialType, string> = {
  KIOSK: 'S/N ตู้ KIOSK',
  MINI_PC: 'S/N Mini PC',
  UPS: 'S/N UPS',
  PRINTER: 'S/N Printer',
  SMART_CARD_READER: 'S/N Smart Card Reader',
  BMS: 'S/N BMS',
  KEY_ID: 'Key ID',
}

// Display/selection order.
export const ALL_SERIAL_TYPES: SerialType[] = [
  'KIOSK', 'MINI_PC', 'UPS', 'PRINTER', 'SMART_CARD_READER', 'BMS', 'KEY_ID',
]
