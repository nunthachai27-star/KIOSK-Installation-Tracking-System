import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStockSummary } from '@/lib/stock'
import { STOCK_LEVEL_META } from '@/lib/stock-shared'
import { formatThaiDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

// สีของไฟล์ (ARGB) — โทนเดียวกับหน้าเว็บ
const C = {
  head: 'FF1F3A5F', headFg: 'FFFFFFFF', title: 'FF1C1917', muted: 'FF7A879A',
  group: 'FFFDEDE3', groupFg: 'FF9A3412', product: 'FFFFFFFF', lot: 'FFF7F9FC', lotFg: 'FF5A6B82',
  total: 'FFE8EEF6', border: 'FFD8DEE6', zebra: 'FFF7F9FC', remain: 'FF157F4C',
}
const LEVEL_ARGB: Record<string, { fg: string; bg: string }> = {
  OK: { fg: 'FF157F4C', bg: 'FFE2F3EA' }, LOW: { fg: 'FFB45309', bg: 'FFFBEBCB' }, OUT: { fg: 'FFC13540', bg: 'FFFBE4E4' },
}
const FONT = 'Tahoma' // มีในทุกเครื่อง Windows และแสดงภาษาไทยได้
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = { style: 'thin' as const, color: { argb: C.border } }
const box = { top: thin, left: thin, bottom: thin, right: thin }

// หัวชีต: ชื่อรายงาน + วันที่ดึง (แถว 1–2) แล้วหัวตารางที่แถว 4
function sheetTitle(ws: ExcelJS.Worksheet, title: string, sub: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols)
  ws.getCell(1, 1).value = title
  ws.getCell(1, 1).font = { name: FONT, size: 15, bold: true, color: { argb: C.title } }
  ws.getRow(1).height = 26
  ws.mergeCells(2, 1, 2, cols)
  ws.getCell(2, 1).value = sub
  ws.getCell(2, 1).font = { name: FONT, size: 9.5, color: { argb: C.muted } }
}
function headerRow(ws: ExcelJS.Worksheet, rowNo: number, labels: string[]) {
  const r = ws.getRow(rowNo)
  r.values = labels
  r.height = 22
  r.eachCell((c) => {
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.headFg } }
    c.fill = fill(C.head)
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = box
  })
}

// POST /api/stock/export { productIds, lots, serials } → ไฟล์ .xlsx สรุปคงเหลือของสินค้าที่เลือก (อ่านอย่างเดียว)
//  - ชีต "สรุปคงเหลือ": แบ่งตามกลุ่ม · 1 แถวต่อสินค้า (+ แถวย่อยต่อ Lot เมื่อ lots = true)
//  - ชีต "รายการ SN คงเหลือ": ทุกชิ้นที่สถานะ IN_STOCK ของสินค้าที่เลือก (เมื่อ serials = true)
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.productIds) ? b.productIds.filter((x: unknown) => typeof x === 'string') : []
  if (!ids.length) return NextResponse.json({ error: 'productIds required', message: 'ยังไม่ได้เลือกสินค้า' }, { status: 400 })
  const withLots = b?.lots === true
  const withSerials = b?.serials === true
  const pick = new Set(ids)

  const { groups } = await getStockSummary()
  const picked = groups
    .map((g) => ({ group: g.group, products: g.products.filter((p) => pick.has(p.id)) }))
    .filter((g) => g.products.length)
  const products = picked.flatMap((g) => g.products)
  const asOf = `ข้อมูล ณ ${formatThaiDate(new Date())} · จ่ายออกรวมชิ้นที่ตัดเคลม · คงเหลือ = รับเข้า − จ่ายออก − ยืม`

  const wb = new ExcelJS.Workbook()
  wb.creator = 'KIOSK Installation Tracking'

  // ── ชีตสรุป ──
  const head = ['สินค้า', 'Lot', 'หน่วย', 'รับเข้า', 'จ่ายออก', 'ในนั้นตัดเคลม', 'ยืม', 'คงเหลือ', 'สถานะ']
  const ws = wb.addWorksheet('สรุปคงเหลือ', { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  ws.columns = [{ width: 38 }, { width: 26 }, { width: 9 }, { width: 10 }, { width: 10 }, { width: 13 }, { width: 8 }, { width: 11 }, { width: 13 }]
  sheetTitle(ws, 'สรุปคงเหลือคลังสินค้า', asOf, head.length)
  headerRow(ws, 4, head)

  const numCols = [4, 5, 6, 7, 8]
  const style = (r: ExcelJS.Row, opt: { bg: string; fg?: string; bold?: boolean; italic?: boolean; indent?: number }) => {
    r.height = 19
    for (let c = 1; c <= head.length; c++) {
      const cell = r.getCell(c)
      cell.font = { name: FONT, size: 10, bold: opt.bold, italic: opt.italic, color: { argb: opt.fg ?? C.title } }
      cell.fill = fill(opt.bg)
      cell.border = box
      cell.alignment = { vertical: 'middle', horizontal: numCols.includes(c) ? 'right' : c === 3 || c === 9 ? 'center' : 'left', indent: c === 1 || c === 2 ? opt.indent : undefined }
      if (numCols.includes(c)) cell.numFmt = '#,##0;-#,##0;"–"'
    }
  }

  const tot = { received: 0, issued: 0, claimed: 0, borrowed: 0, remaining: 0 }
  for (const g of picked) {
    const gr = ws.addRow([`${g.group}  (${g.products.length} รายการ)`])
    ws.mergeCells(gr.number, 1, gr.number, head.length)
    gr.height = 20
    gr.getCell(1).font = { name: FONT, size: 10.5, bold: true, color: { argb: C.groupFg } }
    gr.getCell(1).fill = fill(C.group)
    gr.getCell(1).border = box
    gr.getCell(1).alignment = { vertical: 'middle' }

    for (const p of g.products) {
      const meta = STOCK_LEVEL_META[p.level]
      const r = ws.addRow([p.name, withLots && p.lots.length ? `รวม ${p.lots.length} Lot` : '', p.unit, p.received, p.issued, p.claimed, p.borrowed, p.remaining, meta.label])
      style(r, { bg: C.product, bold: true, indent: 1 })
      r.getCell(2).font = { name: FONT, size: 10, color: { argb: C.muted } }
      r.getCell(8).font = { name: FONT, size: 10.5, bold: true, color: { argb: p.remaining > 0 ? C.remain : LEVEL_ARGB.OUT.fg } }
      const lv = LEVEL_ARGB[p.level]
      r.getCell(9).font = { name: FONT, size: 9.5, bold: true, color: { argb: lv.fg } }
      r.getCell(9).fill = fill(lv.bg)
      if (withLots) {
        for (const l of p.lots) {
          const lr = ws.addRow(['', l.lotCode, p.unit, l.received, l.issued, l.claimed, l.borrowed, l.remaining, ''])
          style(lr, { bg: C.lot, fg: C.lotFg, indent: 2 })
          lr.height = 17
        }
      }
      tot.received += p.received; tot.issued += p.issued; tot.claimed += p.claimed; tot.borrowed += p.borrowed; tot.remaining += p.remaining
    }
  }
  const tr = ws.addRow([`รวมทั้งหมด ${products.length} รายการ`, '', '', tot.received, tot.issued, tot.claimed, tot.borrowed, tot.remaining, ''])
  style(tr, { bg: C.total, bold: true })
  tr.height = 22
  tr.getCell(8).font = { name: FONT, size: 11, bold: true, color: { argb: C.remain } }
  for (let c = 1; c <= head.length; c++) tr.getCell(c).border = { ...box, top: { style: 'medium', color: { argb: C.head } } }

  // ── ชีตรายการ SN ที่ยังอยู่ในคลัง ──
  if (withSerials) {
    const items = await prisma.stockItem.findMany({
      where: { status: 'IN_STOCK', lot: { productId: { in: ids } } },
      select: {
        seq: true, serialNo: true, serialBMS: true, color: true, receivedDate: true, note: true,
        lot: { select: { lotCode: true, receivedDate: true, productId: true } },
      },
    })
    const order = new Map(products.map((p, i) => [p.id, i]))
    const byId = new Map(products.map((p) => [p.id, p]))
    items.sort((a, b) =>
      (order.get(a.lot.productId) ?? 0) - (order.get(b.lot.productId) ?? 0)
      || a.lot.lotCode.localeCompare(b.lot.lotCode)
      || (a.seq ?? 0) - (b.seq ?? 0)
      || (a.serialNo ?? '').localeCompare(b.serialNo ?? ''))

    const sHead = ['ลำดับ', 'กลุ่มสินค้า', 'สินค้า', 'Lot', 'Serial No', 'Serial BMS', 'สี', 'วันรับเข้า', 'หมายเหตุ']
    const ws2 = wb.addWorksheet('รายการ SN คงเหลือ', { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
    ws2.columns = [{ width: 7 }, { width: 18 }, { width: 34 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 8 }, { width: 14 }, { width: 26 }]
    sheetTitle(ws2, `รายการ Serial ที่ยังอยู่ในคลัง (${items.length} ชิ้น)`, asOf, sHead.length)
    headerRow(ws2, 4, sHead)
    items.forEach((it, i) => {
      const p = byId.get(it.lot.productId)
      const rcv = it.receivedDate ?? it.lot.receivedDate
      const r = ws2.addRow([i + 1, p?.group ?? '', p?.name ?? '', it.lot.lotCode, it.serialNo ?? '', it.serialBMS ?? '', it.color ?? '', rcv ? formatThaiDate(rcv) : '', it.note ?? ''])
      r.height = 18
      r.eachCell({ includeEmpty: true }, (cell, c) => {
        if (c > sHead.length) return
        cell.font = { name: FONT, size: 10, bold: c === 5 || c === 6, color: { argb: C.title } }
        if (i % 2 === 1) cell.fill = fill(C.zebra)
        cell.border = box
        cell.alignment = { vertical: 'middle', horizontal: c === 1 || c === 7 || c === 8 ? 'center' : 'left' }
      })
    })
    if (items.length) ws2.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + items.length, column: sHead.length } }
  }

  const buf = await wb.xlsx.writeBuffer()
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const name = `สรุปคงเหลือคลัง_${ymd}.xlsx`
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="stock_${ymd}.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  })
}
