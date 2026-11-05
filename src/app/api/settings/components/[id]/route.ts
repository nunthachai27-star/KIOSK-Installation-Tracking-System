import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// GET: ตรวจ "ผลกระทบ" ก่อนลบ/แก้ชื่ออุปกรณ์ BOM — นับเครื่องที่ตัด/ผูกไว้ในงานประเภทนี้
// ที่ใช้ชื่ออุปกรณ์นี้ (label) ถ้าลบ อุปกรณ์เหล่านั้นจะไม่ตรงสเปกและไม่แสดงในหน้างาน
// (ถ้าเปลี่ยนชื่อ PATCH จะย้าย label ตามให้)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const c = await prisma.productComponent.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const where = { label: c.name, job: { productType: c.productType } }
  const [serials, jobRows] = await Promise.all([
    prisma.serialNumber.count({ where }),
    prisma.serialNumber.findMany({ where, select: { jobId: true }, distinct: ['jobId'] }),
  ])

  return NextResponse.json(
    { name: c.name, productType: c.productType, serials, jobs: jobRows.length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.productComponent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: { name?: string; quantity?: number; needsSerial?: boolean; active?: boolean } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (Number.isFinite(body.quantity) && body.quantity > 0) data.quantity = Math.floor(body.quantity)
  if (typeof body.needsSerial === 'boolean') data.needsSerial = body.needsSerial
  if (typeof body.active === 'boolean') data.active = body.active

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.productComponent.findUnique({
      where: { productType_name: { productType: existing.productType, name: data.name } },
    })
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  }

  // เปลี่ยนชื่อ: Serial ในงานจับคู่กับอุปกรณ์ด้วยชื่อ (label) — ไล่เปลี่ยน label ของงานประเภทเดียวกัน
  // ไปพร้อมกัน ไม่งั้นเครื่องที่ตัดไปแล้วจะหลุดจากหน้างาน (ประเภทอื่นที่ชื่อซ้ำไม่โดน)
  const renamed = !!data.name && data.name !== existing.name
  const [updated, moved] = await prisma.$transaction(async (tx) => {
    const u = await tx.productComponent.update({ where: { id }, data })
    const m = renamed
      ? await tx.serialNumber.updateMany({ where: { label: existing.name, job: { productType: existing.productType } }, data: { label: data.name } })
      : { count: 0 }
    return [u, m.count] as const
  })
  if (renamed) {
    await logAction(session.user, 'UPDATE', 'อุปกรณ์ในสเปก',
      `${existing.productType}: เปลี่ยนชื่อ “${existing.name}” → “${data.name}” (ย้าย Serial ในงานเดิม ${moved} รายการ)`)
  }
  return NextResponse.json({ ...updated, movedSerials: moved })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.productComponent.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
