import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

type RowIn = { serialNo?: unknown; receivedDate?: unknown }

const ymd = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}
const toDate = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null)

// นำเข้าสต็อกจาก Excel/CSV — 1 แถว = 1 เครื่อง (serial no. + วันรับเข้า)
// เจอ serial ซ้ำ (ในไฟล์ หรือในระบบ) = หยุดทั้งไฟล์ ให้แก้ก่อน (commit จะไม่บันทึกอะไรเลย)
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  // นำเข้าจากไฟล์ = งานละเอียดอ่อน → เฉพาะ super admin
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin เท่านั้นที่นำเข้าได้' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  const { productId, newProduct, lotId, lotCode, note, commit } = body as {
    productId?: string; newProduct?: { group?: string; name?: string; unit?: string; lowStockQty?: number }
    lotId?: string; lotCode?: string; note?: string; commit?: boolean; rows?: RowIn[]
  }
  const rowsIn: RowIn[] = Array.isArray(body.rows) ? body.rows : []

  const useExistingLot = typeof lotId === 'string' && !!lotId
  if (!useExistingLot && (typeof lotCode !== 'string' || !lotCode.trim())) {
    return NextResponse.json({ error: 'lot required', message: 'เลือก Lot เดิม หรือพิมพ์รหัส Lot ใหม่' }, { status: 400 })
  }

  // ── Resolve product (เพื่อเช็คซ้ำในระบบตามรุ่นนั้น) ──
  // existing id, หรือ group+name ที่มีอยู่แล้ว → ได้ pid, ถ้าเป็นรุ่นใหม่ที่ยังไม่มี → pid=null (ไม่มีของเดิมให้ซ้ำ)
  let pid: string | null = null
  let createGroup = '', createName = '', createUnit = 'เครื่อง', createLow = 3
  if (typeof productId === 'string' && productId) {
    const exists = await prisma.stockProduct.findUnique({ where: { id: productId }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'product not found' }, { status: 404 })
    pid = exists.id
  } else if (newProduct && typeof newProduct.group === 'string' && newProduct.group.trim() && typeof newProduct.name === 'string' && newProduct.name.trim()) {
    createGroup = newProduct.group.trim(); createName = newProduct.name.trim()
    createUnit = typeof newProduct.unit === 'string' && newProduct.unit.trim() ? newProduct.unit.trim() : 'เครื่อง'
    createLow = Number.isFinite(Number(newProduct.lowStockQty)) ? Math.max(0, Number(newProduct.lowStockQty)) : 3
    const found = await prisma.stockProduct.findUnique({ where: { group_name: { group: createGroup, name: createName } }, select: { id: true } })
    pid = found?.id ?? null
  } else {
    return NextResponse.json({ error: 'product required', message: 'เลือกรุ่นสินค้าหรือระบุกลุ่ม+ชื่อรุ่นใหม่' }, { status: 400 })
  }

  // ── Normalize rows ── (ข้ามแถวว่างสนิท, เก็บลำดับไว้รายงานปัญหา)
  type R = { line: number; serialNo: string | null; date: string | null }
  const rows: R[] = []
  rowsIn.forEach((r, i) => {
    const serialNo = typeof r.serialNo === 'string' ? r.serialNo.trim() : (r.serialNo != null ? String(r.serialNo).trim() : '')
    const date = ymd(r.receivedDate)
    if (!serialNo && !date) return // แถวว่างสนิท → ข้าม
    rows.push({ line: i + 2, serialNo: serialNo || null, date }) // line = เลขแถวใน Excel (บวก header)
  })

  if (!rows.length) return NextResponse.json({ error: 'empty', message: 'ไม่พบข้อมูลในไฟล์' }, { status: 400 })

  // ── ตรวจปัญหา ──
  const blanks = rows.filter((r) => !r.serialNo).map((r) => r.line) // มีวันที่แต่ไม่มี serial
  const seen = new Map<string, number>()
  const inFileDups: string[] = []
  for (const r of rows) {
    if (!r.serialNo) continue
    const k = r.serialNo.toLowerCase()
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    if (n === 2) inFileDups.push(r.serialNo)
  }
  // ซ้ำในระบบ (เฉพาะรุ่นที่มีอยู่แล้ว)
  let systemDups: string[] = []
  const serials = [...new Set(rows.filter((r) => r.serialNo).map((r) => r.serialNo as string))]
  if (pid && serials.length) {
    const hits = await prisma.stockItem.findMany({
      where: { lot: { productId: pid }, OR: serials.map((s) => ({ serialNo: { equals: s, mode: 'insensitive' as const } })) },
      select: { serialNo: true },
    })
    systemDups = [...new Set(hits.map((h) => h.serialNo).filter((s): s is string => !!s))]
  }

  const problems = { blanks, inFileDups, systemDups }
  const hasProblem = blanks.length > 0 || inFileDups.length > 0 || systemDups.length > 0
  const summary = { total: rows.length, ready: rows.length - blanks.length, ...problems }

  // ── Preview ── (ไม่บันทึก)
  if (!commit) return NextResponse.json({ ok: !hasProblem, summary }, { headers: { 'Cache-Control': 'no-store' } })

  // ── Commit ── เจอปัญหา = ไม่บันทึกอะไรเลย (หยุดทั้งไฟล์)
  if (hasProblem) {
    return NextResponse.json({ error: 'has_problem', message: 'พบ serial ซ้ำ/ว่าง — แก้ไฟล์ก่อนแล้วนำเข้าใหม่', summary }, { status: 409 })
  }

  // วันรับเข้าของ Lot = วันแรกสุดในไฟล์ (ถ้ามี)
  const dates = rows.map((r) => r.date).filter((d): d is string => !!d).sort()
  const lotRecv = toDate(dates[0] ?? null)

  const result = await prisma.$transaction(async (tx) => {
    if (!pid) {
      const created = await tx.stockProduct.create({ data: { group: createGroup, name: createName, unit: createUnit, lowStockQty: createLow } })
      pid = created.id
    }
    let targetLotId: string, targetLotCode: string
    if (useExistingLot) {
      // เพิ่มเข้า Lot เดิม — ต่อลำดับจากของเดิม + เพิ่ม receivedQty
      const lot = await tx.stockLot.findUnique({ where: { id: lotId }, select: { id: true, lotCode: true, productId: true } })
      if (!lot || lot.productId !== pid) throw new Error('lot-mismatch')
      const last = await tx.stockItem.findFirst({ where: { lotId: lot.id }, orderBy: { seq: 'desc' }, select: { seq: true } })
      const startSeq = (last?.seq ?? 0) + 1
      await tx.stockItem.createMany({
        data: rows.map((r, i) => ({ lotId: lot.id, seq: startSeq + i, serialNo: r.serialNo, status: 'IN_STOCK' as const, receivedDate: toDate(r.date) })),
      })
      await tx.stockLot.update({ where: { id: lot.id }, data: { receivedQty: { increment: rows.length } } })
      targetLotId = lot.id; targetLotCode = lot.lotCode
    } else {
      const lot = await tx.stockLot.create({
        data: { productId: pid, lotCode: (lotCode as string).trim(), receivedQty: rows.length, receivedDate: lotRecv, note: typeof note === 'string' && note.trim() ? note.trim() : null },
      })
      await tx.stockItem.createMany({
        data: rows.map((r, i) => ({ lotId: lot.id, seq: i + 1, serialNo: r.serialNo, status: 'IN_STOCK' as const, receivedDate: toDate(r.date) })),
      })
      targetLotId = lot.id; targetLotCode = lot.lotCode
    }
    return { productId: pid, lotId: targetLotId, lotCode: targetLotCode, count: rows.length }
  }).catch((e) => {
    if (e instanceof Error && e.message === 'lot-mismatch') return null
    throw e
  })

  if (!result) return NextResponse.json({ error: 'lot-mismatch', message: 'Lot ที่เลือกไม่ตรงกับรุ่นสินค้า' }, { status: 400 })

  await logAction(session.user, 'CREATE', 'คลังสินค้า', `นำเข้าจากไฟล์ ${result.count} เครื่อง (Lot ${result.lotCode})`)
  return NextResponse.json({ ok: true, ...result }, { status: 201 })
}
