import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/superAdmin'
import { prisma } from '@/lib/prisma'
import { logChange } from '@/lib/audit'

// จ่ายออกเอง (super admin เท่านั้น) — ตัดเครื่องออกจากคลังเป็นสถานะ "จ่ายออกแล้ว"
// โดยกรอกรายละเอียดเอง และ "ไม่ผูกเข้างานใด ๆ" (jobId/hospitalId ปล่อยเป็น null)
// ใช้กรณีจ่ายของออกนอกระบบงานปกติ เช่น บริจาค/ทดสอบ/ส่งซ่อม ฯลฯ
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  // ต้องเป็น OFFICE และเป็น super admin
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin เท่านั้น' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const destination = str(body.destination) // ปลายทาง/ผู้รับ (free-text)
  const note = str(body.note)               // หมายเหตุ/เหตุผล
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
      // ไม่ผูกงาน: jobId/hospitalId เป็น null, เก็บปลายทางเป็น free-text
      jobId: null,
      hospitalId: null,
      hospitalName: destination || null,
      note: note || null,
    },
  })

  const label = item.serialNo || item.serialBMS || item.lot.product.name
  await logChange(session.user, 'UPDATE', 'คลังสินค้า', `จ่ายออกเอง (ไม่ผูกงาน) ${label}${destination ? ` → ${destination}` : ''}`, { refTable: 'StockItem', refId: id, before, after: updated })
  return NextResponse.json({ ok: true, id, status: 'ISSUED', issuedDate: issuedDate.toISOString(), hospitalName: destination || null, note: note || null })
}
