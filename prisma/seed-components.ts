/**
 * Seed product component lists (BOM) from Jakkrit's spec. Upsert; safe to re-run.
 * needsSerial follows the "main electronics only" rule.
 *   npx tsx prisma/seed-components.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type C = [name: string, qty: number, needsSerial: boolean]

const BOM: Record<string, C[]> = {
  'Kiosk (BMS)': [
    ['ตู้ Kiosk', 1, true], ['Smartcard Reader', 1, true], ['Mini PC', 1, true], ['เครื่องสำรองไฟ UPS', 1, true],
  ],
  'NonCash': [
    ['ตู้ Kiosk', 1, true], ['เครื่องสำรองไฟ UPS', 1, true],
  ],
  'ตู้ Kiosk Start Smart': [
    ['ตู้ Kiosk รุ่น Start Smart', 1, true], ['Smartcard Reader', 1, true], ['เครื่องสำรองไฟ UPS', 1, true],
  ],
  'ตู้ Kiosk HI-END': [
    ['ตู้ Kiosk รุ่น HI-END', 1, true], ['Smartcard Reader', 1, true], ['เครื่องสำรองไฟ UPS', 1, true],
  ],
  'Mini Kiosk': [
    ['Tablet', 1, true], ['Smartcard Reader', 1, true], ['HUB USB', 1, false], ['Printer', 1, true], ['เคส Mini Kiosk + พัดลม', 1, false],
  ],
  'ชุดปิดสิทธิ พร้อมเครื่องพิมพ์': [
    ['Tablet', 1, true], ['Smartcard Reader', 1, true], ['HUB USB', 1, false], ['Printer', 1, true], ['เคส Mini Kiosk + พัดลม', 1, false],
  ],
  'ชุดปิดสิทธิ แบบไม่มีเครื่องพิมพ์': [
    ['Tablet', 1, true], ['Smartcard Reader', 1, true], ['HUB USB', 1, false], ['ขาตั้งชุดประกอบ', 1, false],
  ],
  'QR-Payment 67': [
    ['Tablet', 1, true], ['Smartcard Reader', 1, true], ['HUB USB', 1, false], ['ขาตั้งแท็บเล็ตสีเงิน', 1, false],
  ],
  'consent IPD': [
    ['Tablet', 1, true], ['Smartcard Reader', 1, true], ['HUB USB', 1, false], ['ขาตั้งแท็บเล็ตสีเงิน', 1, false],
  ],
  'รถเข็น': [
    ['รถเข็นแพทย์', 1, true], ['คอมพิวเตอร์ All in One', 1, true], ['แท็บเล็ต', 2, true],
    ['QR Code Reader', 2, true], ['เครื่องอ่านบัตร NFC', 2, true], ['บัตร NFC', 50, false], ['ปลั๊กกันกระชาก', 1, false],
  ],
  'Payment': [
    ['ตู้ Kiosk', 1, true], ['เครื่องสำรองไฟ UPS', 1, true], ['เครื่องรับธนบัตร', 1, true], ['เครื่องรับเหรียญ', 1, true],
  ],
}

async function main() {
  let n = 0
  for (const [productType, comps] of Object.entries(BOM)) {
    for (let i = 0; i < comps.length; i++) {
      const [name, quantity, needsSerial] = comps[i]
      await prisma.productComponent.upsert({
        where: { productType_name: { productType, name } },
        create: { productType, name, quantity, needsSerial, sortOrder: i },
        update: { quantity, needsSerial, sortOrder: i },
      })
      n++
    }
    console.log('set', productType, `(${comps.length} components)`)
  }
  console.log(`done: ${n} components across ${Object.keys(BOM).length} products`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
