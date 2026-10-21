import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/superAdmin'
import { prisma } from '@/lib/prisma'
import { logChange } from '@/lib/audit'

// จ่ายออกเอง (super admin เท่านั้น) — ตัดเครื่องออกจากคลังเป็นสถานะ "จ่ายออกแล้ว"
// โดยกรอกรายละเอียดเอง และ "ไม่ผูกเข้างานใด ๆ" (jobId/hospitalId ปล่อยเป็น null)
// ใช้กรณีจ่ายของออกนอกระบบงานปกติ เช่น บริจาค/ทดสอบ/ส่งซ่อม ฯลฯ
//  POST   = จ่ายออก (ต้องยังอยู่ในคลัง)
//  PATCH  = แก้ไขรายละเอียดของรายการที่จ่ายออกเอง
//  DELETE = ยกเลิกการจ่ายออก → คืนเครื่องกลับเข้าคลัง

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// gate: ต้องเป็น OFFICE + super admin
async function guard() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  if (!(await isSuperAdmin())) return { error: NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin เท่านั้น' }, { status: 403 }) }
  return { session }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (g.error) return g.error
  const session = g.session

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const destination = str(body.destination) // ปลายทาง/ผู้รับ (free-text)
  const note = str(body.note)               // หมายเหตุ/เหตุผล
  const serialBMS = str(body.serialBMS)     // S/N BMS (กรอกเองได้)
  const dateStr = str(body.issuedDate)      // YYYY-MM-DD (ไม่ระบุ = วันนี้)

  // เครื่องต้องยังอยู่ในคลังเท่านั้นถึงจะจ่ายออกได้
  const item = await prisma.stockItem.findUnique({
    where: { id },
    select: { id: true, status: true, serialNo: true, serialBMS: true, lot: { select: { lotCode: true, product: { select: { name: true } } } } },
  })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (item.status !== 'IN_STOCK') {
    const why = item.status === 'BORROWED' ? 'เครื่องนี้ถูกยืมอยู่' : item.status === 'CLAIM' ? 'เครื่องนี้ตัดเป็นเคลมแล้ว' : 'เครื่องนี้จ่ายออกไปแล้ว'
    return NextResponse.json({ error: 'unavailable', message: `${why} — จ่ายออกไม่ได้` }, { status: 409 })
  }

  const issuedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T00:00:00Z`) : new Date()

  const before = await prisma.stockItem.findUnique({ where: { id } })
  const updated = await prisma.stockItem.update({
    where: { id },
    data: {
      status: 'ISSUED',
      issuedDate,
      issuedAt: new Date(),
      issuedById: session.user?.id ?? null,
      serialBMS: serialBMS || item.serialBMS || null,
      // ไม่ผูกงาน: jobId/hospitalId เป็น null, เก็บปลายทางเป็น free-text
      jobId: null,
      hospitalId: null,
      hospitalName: destination || null,
      note: note || null,
    },
  })

  const label = updated.serialNo || updated.serialBMS || item.lot.product.name
  await logChange(session.user, 'UPDATE', 'คลังสินค้า', `จ่ายออกเอง (ไม่ผูกงาน) ${label}${destination ? ` → ${destination}` : ''}`, { refTable: 'StockItem', refId: id, before, after: updated })
  return NextResponse.json({ ok: true, id, status: 'ISSUED', serialBMS: updated.serialBMS, issuedDate: issuedDate.toISOString(), hospitalName: destination || null, note: note || null })
}

// แก้ไขรายละเอียดของรายการที่ "จ่ายออกเอง" (ไม่ผูกงาน) เท่านั้น
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (g.error) return g.error
  const session = g.session

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const destination = str(body.destination)
  const note = str(body.note)
  const serialBMS = str(body.serialBMS)
  const dateStr = str(body.issuedDate)

  const item = await prisma.stockItem.findUnique({ where: { id }, select: { id: true, status: true, jobId: true, serialNo: true, serialBMS: true } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // แก้ได้เฉพาะรายการที่จ่ายออกแบบไม่ผูกงาน (กันไปยุ่งรายการที่ผูกกับงานจริง)
  if (item.status !== 'ISSUED' || item.jobId) {
    return NextResponse.json({ error: 'not_manual', message: 'แก้ไขได้เฉพาะรายการที่จ่ายออกเอง (ไม่ผูกกับงาน)' }, { status: 409 })
  }

  const issuedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T00:00:00Z`) : undefined

  const before = await prisma.stockItem.findUnique({ where: { id } })
  const updated = await prisma.stockItem.update({
    where: { id },
    data: {
      hospitalName: destination || null,
      note: note || null,
      serialBMS: serialBMS || null,
      ...(issuedDate ? { issuedDate } : {}),
    },
  })
  const label = updated.serialNo || updated.serialBMS || id
  await logChange(session.user, 'UPDATE', 'คลังสินค้า', `แก้ไขรายการจ่ายออกเอง ${label}`, { refTable: 'StockItem', refId: id, before, after: updated })
  return NextResponse.json({ ok: true, id, serialBMS: updated.serialBMS, issuedDate: updated.issuedDate?.toISOString() ?? null, hospitalName: updated.hospitalName, note: updated.note })
}

// ยกเลิกการจ่ายออกเอง → คืนเครื่องกลับเข้าคลัง (เฉพาะรายการที่ไม่ผูกงาน)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (g.error) return g.error
  const session = g.session

  const { id } = await params
  const item = await prisma.stockItem.findUnique({ where: { id }, select: { id: true, status: true, jobId: true, serialNo: true, serialBMS: true } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (item.status !== 'ISSUED' || item.jobId) {
    return NextResponse.json({ error: 'not_manual', message: 'ยกเลิกได้เฉพาะรายการที่จ่ายออกเอง (ไม่ผูกกับงาน)' }, { status: 409 })
  }

  const before = await prisma.stockItem.findUnique({ where: { id } })
  const updated = await prisma.stockItem.update({
    where: { id },
    // คืนสู่คลัง: ล้างวันจ่ายออก/ปลายทาง/หมายเหตุ/ผู้ตัด ให้กลับเป็นเหมือนก่อนตัด
    data: { status: 'IN_STOCK', issuedDate: null, issuedAt: null, issuedById: null, hospitalName: null, hospitalId: null, note: null },
  })
  const label = item.serialNo || item.serialBMS || id
  await logChange(session.user, 'UPDATE', 'คลังสินค้า', `ยกเลิกการจ่ายออกเอง ${label} (คืนเข้าคลัง)`, { refTable: 'StockItem', refId: id, before, after: updated })
  return NextResponse.json({ ok: true, id, status: 'IN_STOCK' })
}
