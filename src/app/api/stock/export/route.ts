import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStockSummary } from '@/lib/stock'
import { STOCK_LEVEL_META } from '@/lib/stock-shared'
import { formatThaiDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

// POST /api/stock/export { productIds, lots, serials } → ไฟล์ .xlsx สรุปคงเหลือของสินค้าที่เลือก (อ่านอย่างเดียว)
//  - ชีต "สรุปคงเหลือ": 1 แถวต่อสินค้า (+ แถวย่อยต่อ Lot เมื่อ lots = true)
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
  const products = groups.flatMap((g) => g.products).filter((p) => pick.has(p.id))

  // ── ชีตสรุป ──
  const head = ['กลุ่มสินค้า', 'สินค้า', 'Lot', 'หน่วย', 'รับเข้า', 'จ่ายออก', '(ในนั้นตัดเคลม)', 'ยืม', 'คงเหลือ', 'สถานะ']
  const rows: (string | number)[][] = [head]
  const tot = { received: 0, issued: 0, claimed: 0, borrowed: 0, remaining: 0 }
  for (const p of products) {
    rows.push([p.group, p.name, withLots ? 'รวมทุก Lot' : '', p.unit, p.received, p.issued, p.claimed, p.borrowed, p.remaining, STOCK_LEVEL_META[p.level].label])
    if (withLots) {
      for (const l of p.lots) rows.push(['', '', l.lotCode, p.unit, l.received, l.issued, l.claimed, l.borrowed, l.remaining, ''])
    }
    tot.received += p.received; tot.issued += p.issued; tot.claimed += p.claimed; tot.borrowed += p.borrowed; tot.remaining += p.remaining
  }
  rows.push(['รวมทั้งหมด', `${products.length} รายการ`, '', '', tot.received, tot.issued, tot.claimed, tot.borrowed, tot.remaining, ''])
  rows.push([])
  rows.push([`ข้อมูล ณ ${formatThaiDate(new Date())} · จ่ายออกรวมชิ้นที่ตัดเคลม · คงเหลือ = รับเข้า − จ่ายออก − ยืม`])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 7 }, { wch: 9 }, { wch: 11 }]
  XLSX.utils.book_append_sheet(wb, ws, 'สรุปคงเหลือ')

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
    const sRows: (string | number)[][] = [['ลำดับ', 'กลุ่มสินค้า', 'สินค้า', 'Lot', 'Serial No', 'Serial BMS', 'สี', 'วันรับเข้า', 'หมายเหตุ']]
    items.forEach((it, i) => {
      const p = byId.get(it.lot.productId)
      const rcv = it.receivedDate ?? it.lot.receivedDate
      sRows.push([i + 1, p?.group ?? '', p?.name ?? '', it.lot.lotCode, it.serialNo ?? '', it.serialBMS ?? '', it.color ?? '', rcv ? formatThaiDate(rcv) : '', it.note ?? ''])
    })
    const ws2 = XLSX.utils.aoa_to_sheet(sRows)
    ws2['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'รายการ SN คงเหลือ')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const name = `สรุปคงเหลือคลัง_${ymd}.xlsx`
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="stock_${ymd}.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  })
}
