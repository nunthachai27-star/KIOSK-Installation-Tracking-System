/**
 * Seed default BMS serial codes per product type (derived from existing data —
 * the most-used code for each product type). Upsert; safe to re-run.
 *   npx tsx prisma/seed-bms-codes.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CODES: Record<string, string> = {
  'Kiosk (BMS)': 'KI',
  'Mini Kiosk': 'MKI',
  'consent IPD': 'CIPD',
  'QR-Payment 67': 'QRP',
  'รถเข็น Start Smart': 'SS',
  'อุปกรณ์ Kiosk': 'KIP',
  'ชุดปิดสิทธิ': 'MIKI',
  'ชุดปิดสิทธิ แบบไม่มีเครื่องพิมพ์': 'MIKI',
  'ตู้ Kiosk HI-END': 'KIH',
  'ตู้ Kiosk Start Smart': 'KIS',
  'รถเข็น': 'IPD',
  'รถเข็นพยาบาล': 'NWF',
  'NonCash': 'KIP',
  'Payment': 'KIP',
  'IDP2567': 'IDP',
}

async function main() {
  let n = 0
  for (const [productType, code] of Object.entries(CODES)) {
    await prisma.productBmsCode.upsert({
      where: { productType },
      create: { productType, code },
      update: { code },
    })
    n++
    console.log('set', productType, '→', code)
  }
  console.log(`done: ${n} codes`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
