/**
 * Backfill HandoverRecord.checklistReceivedDate + handoverDate from the text
 * that the original import left in `remark`, e.g.
 *   "Checklist: Sat Mar 29 2566 ... | ส่งมอบ/บิล: Thu May 08 2566 ..."
 * Non-date handover values (e.g. "รอสัญญา") are left as null.
 *
 *   npx tsx prisma/backfill-handover-dates.ts            # dry run
 *   npx tsx prisma/backfill-handover-dates.ts --commit   # write
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const COMMIT = process.argv.includes('--commit')

const EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Parse a JS Date.toString() value ("Sat Mar 29 2566 00:00:00 GMT+0000 ...").
// The source has mistyped years, corrected the same way the import/reconcile did:
//   19xx → +600 (1969 → 2569 BE),  30xx → −1000 (3025 → 2025),  then BE → CE.
function parseStamp(s: string): Date | null {
  const m = s.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/)
  if (!m) return null
  const mm = EN[m[1].toLowerCase()]
  if (!mm) return null
  let y = +m[3]
  if (y >= 1900 && y < 2000) y += 600
  if (y >= 3000 && y < 3100) y -= 1000
  if (y >= 2400) y -= 543
  const d = new Date(Date.UTC(y, mm - 1, +m[2]))
  return isNaN(d.getTime()) ? null : d
}

function segment(remark: string, label: string): string | null {
  for (const part of remark.split('|')) {
    const t = part.trim()
    if (t.startsWith(label)) return t.slice(label.length).trim()
  }
  return null
}

async function main() {
  const recs = await prisma.handoverRecord.findMany({ where: { remark: { not: null } } })
  let cl = 0, ho = 0, upd = 0
  for (const r of recs) {
    // Always recompute from remark (the source of truth) so re-runs correct
    // any previously mis-parsed years.
    const remark = r.remark ?? ''
    const clDate = parseStamp(segment(remark, 'Checklist:') ?? '')
    const hoDate = parseStamp(segment(remark, 'ส่งมอบ/บิล:') ?? '')
    const data: { checklistReceivedDate?: Date; handoverDate?: Date } = {}
    if (clDate) { data.checklistReceivedDate = clDate; cl++ }
    if (hoDate) { data.handoverDate = hoDate; ho++ }
    if (Object.keys(data).length) {
      upd++
      if (COMMIT) await prisma.handoverRecord.update({ where: { id: r.id }, data })
    }
  }
  console.log(`${COMMIT ? 'COMMIT' : 'DRY RUN'}: records=${recs.length} checklistDates=${cl} handoverDates=${ho} updated=${upd}`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
