/**
 * One-time ETL: import the real "ตารางติดตั้ง KIOSK.xlsx" (25 sheets) into the DB.
 *
 *   npx tsx prisma/import-kiosk.ts "<file.xlsx>"            # DRY RUN (no writes)
 *   npx tsx prisma/import-kiosk.ts "<file.xlsx>" --commit   # wipe demo + import
 *
 * Column layout varies per sheet, so columns are matched by header keyword.
 * Merged/continuation rows (blank hospital but a serial) attach extra serial
 * numbers to the job above.
 */
import xlsx from 'xlsx'
import { PrismaClient, type JobStatus, type SerialType } from '@prisma/client'

const prisma = new PrismaClient()

const file = process.argv[2]
const COMMIT = process.argv.includes('--commit')
if (!file) {
  console.error('usage: tsx prisma/import-kiosk.ts <file.xlsx> [--commit]')
  process.exit(2)
}

const norm = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim()
const clean = (v: unknown): string | null => {
  const s = norm(v)
  return s === '' || s === '-' || s === '·' ? null : s
}

// ---- date parsing (mixed BE/CE, Thai/English, "N วัน" durations) ----
const THAI_MONTHS: Record<string, number> = {
  'ม.ค': 1, มกรา: 1, มกราคม: 1, กพ: 2, 'ก.พ': 2, กุมภา: 2, กุมภาพันธ์: 2,
  'มี.ค': 3, มีนา: 3, มีนาคม: 3, มีค: 3, เมษา: 4, เมษายน: 4, เมย: 4, 'เม.ย': 4,
  'พ.ค': 5, พฤษภา: 5, พฤษภาคม: 5, พค: 5, 'มิ.ย': 6, มิถุนา: 6, มิถุนายน: 6, มิย: 6,
  'ก.ค': 7, กรกฎา: 7, กรกฎาคม: 7, กค: 7, 'ส.ค': 8, สิงหา: 8, สิงหาคม: 8, สค: 8,
  'ก.ย': 9, กันยา: 9, กันยายน: 9, กย: 9, 'ต.ค': 10, ตุลา: 10, ตุลาคม: 10, ตค: 10,
  'พ.ย': 11, พฤศจิกา: 11, พฤศจิกายน: 11, พย: 11, 'ธ.ค': 12, ธันวา: 12, ธันวาคม: 12, ธค: 12,
}
function beToCe(y: number): number {
  if (y < 100) y += 2500 // "66" -> 2566
  return y >= 2400 ? y - 543 : y // BE -> CE
}
function mkDate(y: number, m: number, d: number): Date | null {
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(beToCe(y), m - 1, d))
  return isNaN(dt.getTime()) ? null : dt
}
export function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getUTCFullYear()
    return y >= 2400 ? new Date(Date.UTC(y - 543, v.getUTCMonth(), v.getUTCDate())) : v
  }
  let s = norm(v)
  if (!s) return null
  if (/^\d+\s*วัน/.test(s)) return null // duration, not a date
  s = s.replace(/\(.*?\)/g, ' ').replace(/[.]/g, ' ').trim()
  // D/M/Y
  let m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
  if (m) return mkDate(+m[3], +m[2], +m[1])
  // English "Month D, Y" (with optional weekday)
  m = s.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/)
  if (m) {
    const en: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
    const mm = en[m[1].slice(0, 3).toLowerCase()]
    if (mm) return mkDate(+m[3], mm, +m[2])
  }
  // Thai "D <month> Y" / "วันที่ D <month> Y"
  m = s.match(/(\d{1,2})\s+([ก-ฮ.]+)\s*(\d{2,4})/)
  if (m) {
    const key = Object.keys(THAI_MONTHS).find((k) => m![2].startsWith(k) || m![2] === k)
    if (key) return mkDate(+m[3], THAI_MONTHS[key], +m[1])
  }
  return null
}

function parseMoney(v: unknown): number | null {
  const s = norm(v).replace(/[,\s฿]/g, '')
  if (!s || !/[\d]/.test(s)) return null
  const n = Number(s.replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

// ---- header → column index ----
type Idx = Record<string, number>
function matchColumns(headers: string[]): Idx {
  const f = (pred: (h: string) => boolean) => headers.findIndex(pred)
  return {
    hospital: f((h) => h.includes('โรงพยาบาล')),
    province: f((h) => h.includes('จังหวัด')),
    qty: f((h) => h.includes('จำนวน')),
    accessory: f((h) => h.includes('อุปกรณ์')),
    color: f((h) => h === 'สี'),
    sales: f((h) => h.includes('ยอดขาย')),
    contact: f((h) => h.includes('ผู้ติดต่อ')),
    contract: f((h) => h.includes('สัญญา') || h.includes('ใบสั่งซื้อ')),
    startDate: f((h) => h.includes('วันที่เริ่มสัญญา')),
    dueDate: f((h) => h.includes('กำหนดส่งมอบ')),
    endDate: f((h) => h.includes('สิ้นสุดสัญญา')),
    snBms: f((h) => h.includes('S/N BMS') || h === 'เลข S/N'),
    snKiosk: f((h) => h.includes('ตู้ Kiosk')),
    snUps: f((h) => h.includes('สำรองไฟ')),
    snMiniPc: f((h) => h.toUpperCase().includes('MINI PC')),
    snSmartcard: f((h) => h.toLowerCase().includes('smartcard')),
    keyId: f((h) => h.includes('Key ID')),
    vehicle: f((h) => h === 'รถ'),
    shipped: f((h) => h.includes('ขนตู้') || h.includes('ส่งจากบริษัท') || h.includes('ส่งสินค้าออก')),
    arrived: f((h) => h.includes('ถึงโรงพยาบาล') || h.includes('ถึงรพ') || (h.includes('วันที่ส่ง') && h.includes('ถึง'))),
    remoteDate: f((h) => (h.includes('Remote') || h.includes('Remort')) && h.includes('ติดตั้ง')),
    remoteStaff: f((h) => h.includes('จนท')),
    checklist: f((h) => h.includes('Checklist')),
    handover: f((h) => h.includes('แจ้งส่งมอบ') || h.includes('เปิดใบ')),
    estCost: f((h) => h.includes('ประมาณการค่าขนส่ง')),
    actCost: f((h) => h.includes('ค่าขนส่งจริง') || h.includes('ค่าขนส่งตามจริง')),
  }
}

const cell = (row: unknown[], i: number): unknown => (i >= 0 ? row[i] : undefined)

function statusFor(j: JobDraft): JobStatus {
  if (j.handoverRaw) return 'CLOSED'
  if (j.checklistRaw) return 'HANDED_OVER'
  if (j.remoteDate || j.arrivedDate) return 'INSTALLING'
  if (j.shippedDate) return 'READY_TO_SHIP'
  if (j.serials.length) return 'PREPARING'
  return 'DATA_ENTRY'
}

type SerialDraft = { serialType: SerialType; serialNo: string }
type JobDraft = {
  sheet: string
  jobCode: string
  hospitalName: string
  province: string
  productType: string
  productModel: string | null
  color: string | null
  quantity: number
  salesAmount: number
  contactName: string | null
  contractNo: string | null
  contractStartDate: Date | null
  deliveryDueDate: Date | null
  deliveryDueRaw: string | null
  contractEndDate: Date | null
  shippedDate: Date | null
  arrivedDate: Date | null
  vehicle: string | null
  estCost: number | null
  actCost: number | null
  remoteDate: Date | null
  remoteStaff: string | null
  checklistRaw: string | null
  handoverRaw: string | null
  serials: SerialDraft[]
}

function findHeaderRow(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 8); i++) {
    if (aoa[i].some((c) => norm(c).includes('โรงพยาบาล') || norm(c).includes('จังหวัด'))) return i
  }
  return -1
}

const SERIAL_COLS: [keyof Idx, SerialType][] = [
  ['snBms', 'BMS'], ['snKiosk', 'KIOSK'], ['snUps', 'UPS'],
  ['snMiniPc', 'MINI_PC'], ['snSmartcard', 'SMART_CARD_READER'], ['keyId', 'KEY_ID'],
]

function serialsFromRow(row: unknown[], idx: Idx): SerialDraft[] {
  const out: SerialDraft[] = []
  for (const [key, type] of SERIAL_COLS) {
    const v = clean(cell(row, idx[key]))
    if (v) out.push({ serialType: type, serialNo: v.toUpperCase() })
  }
  return out
}

function parseWorkbook(path: string): JobDraft[] {
  const wb = xlsx.readFile(path, { cellDates: true })
  const jobs: JobDraft[] = []
  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet]
    const aoa = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
    const hr = findHeaderRow(aoa)
    if (hr < 0) continue
    const headers = aoa[hr].map(norm)
    const idx = matchColumns(headers)
    const isLot = /^lot/i.test(sheet)
    let seq = 0
    let current: JobDraft | null = null
    for (let r = hr + 1; r < aoa.length; r++) {
      const row = aoa[r]
      if (!row) continue
      const hosp = clean(cell(row, idx.hospital))
      if (hosp) {
        seq++
        const accessory = clean(cell(row, idx.accessory))
        current = {
          sheet,
          jobCode: `${sheet.replace(/\s+/g, '')}-${seq}`,
          hospitalName: hosp.replace(/\*+.*$/s, '').trim(),
          province: clean(cell(row, idx.province)) ?? '',
          productType: isLot ? 'Kiosk (BMS)' : sheet.trim(),
          productModel: accessory,
          color: clean(cell(row, idx.color)),
          quantity: Math.max(1, Math.round(parseMoney(cell(row, idx.qty)) ?? 1)),
          salesAmount: parseMoney(cell(row, idx.sales)) ?? 0,
          contactName: clean(cell(row, idx.contact)),
          contractNo: clean(cell(row, idx.contract)),
          contractStartDate: parseDate(cell(row, idx.startDate)),
          deliveryDueDate: parseDate(cell(row, idx.dueDate)),
          deliveryDueRaw: clean(cell(row, idx.dueDate)),
          contractEndDate: parseDate(cell(row, idx.endDate)),
          shippedDate: parseDate(cell(row, idx.shipped)),
          arrivedDate: parseDate(cell(row, idx.arrived)),
          vehicle: clean(cell(row, idx.vehicle)),
          estCost: parseMoney(cell(row, idx.estCost)),
          actCost: parseMoney(cell(row, idx.actCost)),
          remoteDate: parseDate(cell(row, idx.remoteDate)),
          remoteStaff: clean(cell(row, idx.remoteStaff)),
          checklistRaw: clean(cell(row, idx.checklist)),
          handoverRaw: clean(cell(row, idx.handover)),
          serials: serialsFromRow(row, idx),
        }
        jobs.push(current)
      } else if (current) {
        // continuation row: attach any serials to the job above
        current.serials.push(...serialsFromRow(row, idx))
      }
    }
  }
  // dedupe serials within a job
  for (const j of jobs) {
    const seen = new Set<string>()
    j.serials = j.serials.filter((s) => {
      const k = `${s.serialType}:${s.serialNo}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }
  return jobs
}

async function main() {
  const jobs = parseWorkbook(file)
  const bySheet = new Map<string, number>()
  const hospitals = new Set<string>()
  let serialCount = 0
  const statusCount: Record<string, number> = {}
  let dueParsed = 0, dueRaw = 0, startParsed = 0, startRaw = 0

  for (const j of jobs) {
    bySheet.set(j.sheet, (bySheet.get(j.sheet) ?? 0) + 1)
    hospitals.add(`${j.hospitalName}|${j.province}`)
    serialCount += j.serials.length
    const st = statusFor(j)
    statusCount[st] = (statusCount[st] ?? 0) + 1
    if (j.deliveryDueRaw) { dueRaw++; if (j.deliveryDueDate) dueParsed++ }
    if (j.contractStartDate) startParsed++
  }

  console.log(`\n===== ${COMMIT ? 'COMMIT' : 'DRY RUN'} =====`)
  console.log(`jobs=${jobs.length}  hospitals(unique)=${hospitals.size}  serials=${serialCount}`)
  console.log('per-sheet:', [...bySheet.entries()].map(([s, n]) => `${s}:${n}`).join('  '))
  console.log('status:', statusCount)
  console.log(`date parse: due ${dueParsed}/${dueRaw} non-duration rows;  start-date parsed on ${startParsed} jobs`)
  console.log('\nsample jobs:')
  for (const j of jobs.slice(0, 4).concat(jobs.slice(-2))) {
    console.log(`  [${j.jobCode}] ${j.hospitalName} (${j.province}) · ${j.productType} · ${j.productModel ?? '-'} ×${j.quantity} · sales=${j.salesAmount} · start=${j.contractStartDate?.toISOString().slice(0, 10) ?? '-'} · serials=${j.serials.length} · status=${statusFor(j)}`)
  }

  if (!COMMIT) {
    console.log('\n(dry run — no database writes)')
    await prisma.$disconnect()
    return
  }

  // ---- COMMIT: wipe demo data (keep users), then import ----
  console.log('\nwiping existing job data (users kept)...')
  await prisma.jobActivity.deleteMany()
  await prisma.serialNumber.deleteMany()
  await prisma.qcRecord.deleteMany()
  await prisma.deliveryRecord.deleteMany()
  await prisma.installationRecord.deleteMany()
  await prisma.handoverRecord.deleteMany()
  await prisma.invoiceRecord.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.job.deleteMany()
  await prisma.hospital.deleteMany()

  const hospCache = new Map<string, string>()
  async function hospitalId(name: string, province: string): Promise<string> {
    const key = `${name}|${province}`
    const hit = hospCache.get(key)
    if (hit) return hit
    const h = await prisma.hospital.create({ data: { name, province } })
    hospCache.set(key, h.id)
    return h.id
  }

  let done = 0
  for (const j of jobs) {
    const hid = await hospitalId(j.hospitalName, j.province)
    const status = statusFor(j)
    const job = await prisma.job.create({
      data: {
        jobCode: j.jobCode,
        sourceLot: j.sheet,
        hospitalId: hid,
        province: j.province,
        productType: j.productType,
        productModel: j.productModel,
        color: j.color,
        quantity: j.quantity,
        salesAmount: j.salesAmount,
        contactName: j.contactName,
        contractNo: j.contractNo,
        contractStartDate: j.contractStartDate,
        deliveryDueDate: j.deliveryDueDate,
        contractEndDate: j.contractEndDate,
        currentStatus: status,
        serials: j.serials.length
          ? { create: j.serials.map((s) => ({ serialType: s.serialType, serialNo: s.serialNo })) }
          : undefined,
      },
    })

    if (j.shippedDate || j.arrivedDate || j.vehicle || j.estCost || j.actCost) {
      await prisma.deliveryRecord.create({
        data: {
          jobId: job.id, shippedDate: j.shippedDate, arrivedDate: j.arrivedDate,
          vehicle: j.vehicle, estimatedCost: j.estCost, actualCost: j.actCost,
          status: j.arrivedDate ? 'ARRIVED' : j.shippedDate ? 'SHIPPING' : 'PENDING',
        },
      })
    }
    if (j.remoteDate || j.remoteStaff) {
      await prisma.installationRecord.create({
        data: {
          jobId: job.id, installType: 'REMOTE', remoteDate: j.remoteDate,
          result: j.remoteStaff ? `จนท. Remote: ${j.remoteStaff}` : null,
          status: j.remoteDate ? 'DONE' : 'PENDING',
        },
      })
    }
    if (j.checklistRaw || j.handoverRaw) {
      await prisma.handoverRecord.create({
        data: {
          jobId: job.id,
          checklistStatus: j.checklistRaw ? 'RECEIVED' : 'PENDING',
          handoverStatus: j.handoverRaw ? 'DELIVERED' : 'PENDING',
          remark: [j.checklistRaw && `Checklist: ${j.checklistRaw}`, j.handoverRaw && `ส่งมอบ/บิล: ${j.handoverRaw}`].filter(Boolean).join(' | ') || null,
        },
      })
    }
    if (j.handoverRaw) {
      await prisma.invoiceRecord.create({
        data: { jobId: job.id, status: 'ISSUED', invoiceAmount: j.salesAmount || null, remark: j.handoverRaw },
      })
    }
    done++
    if (done % 100 === 0) console.log(`  ...${done}/${jobs.length}`)
  }
  console.log(`\nDONE: created ${done} jobs, ${hospCache.size} hospitals.`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
