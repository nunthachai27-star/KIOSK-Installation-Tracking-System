import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction, logChange } from '@/lib/audit'
import { isCategory } from '@/lib/master'
import { applyRename, findCollisions } from '@/lib/master-rename'
import { isSuperAdmin } from '@/lib/superAdmin'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.masterOption.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: { value?: string; active?: boolean } = {}
  if (typeof body.value === 'string' && body.value.trim()) data.value = body.value.trim()
  if (typeof body.active === 'boolean') data.active = body.active

  // Rename vs. active-only toggle. A rename has to reach the copies of this value
  // stored on jobs / product specs / delivery, or those rows keep the old text.
  const renaming = !!data.value && data.value !== existing.value
  if (!renaming) {
    const updated = await prisma.masterOption.update({ where: { id }, data })
    await logChange(session.user, 'UPDATE', 'ตั้งค่า', `แก้ตัวเลือก "${updated.value}"`, { refTable: 'MasterOption', refId: id, before: existing, after: updated })
    return NextResponse.json(updated)
  }

  const from = existing.value
  const to = data.value as string
  const dup = await prisma.masterOption.findUnique({
    where: { category_value: { category: existing.category, value: to } },
  })

  // Categories without copy-propagation (e.g. per-type equipment): plain rename only.
  if (!isCategory(existing.category)) {
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
    const updated = await prisma.masterOption.update({ where: { id }, data })
    await logChange(session.user, 'UPDATE', 'ตั้งค่า', `แก้ตัวเลือก "${updated.value}"`, { refTable: 'MasterOption', refId: id, before: existing, after: updated })
    return NextResponse.json(updated)
  }

  // Renaming onto a name held in a uniquely-keyed table (QC/BOM/etc.) can't be merged.
  const collisions = await findCollisions(prisma, existing.category, to)
  if (collisions.length) {
    return NextResponse.json({
      error: 'collision',
      message: `มีการตั้งค่าของ "${to}" อยู่แล้ว (${collisions.join(', ')}) — รวมกันไม่ได้ ต้องจัดการของเดิมก่อน`,
    }, { status: 409 })
  }

  // Renaming onto an existing option = MERGE: rewrite every copy from→to, then remove
  // the now-redundant source option (the destination option stays). Undoable via Log.
  if (dup) {
    const moved = await prisma.$transaction(async (tx) => {
      const m = await applyRename(tx, existing.category as Parameters<typeof applyRename>[1], from, to)
      await tx.masterOption.delete({ where: { id } })
      return m
    })
    await logChange(session.user, 'DELETE', 'ตั้งค่า', `รวม "${from}" → "${to}"`, { refTable: 'MasterOption', refId: id, before: existing })
    return NextResponse.json({ merged: true, into: to, renamedFrom: from, updatedRows: moved })
  }

  // Normal rename — destination name is free.
  const [updated, moved] = await prisma.$transaction(async (tx) => {
    const u = await tx.masterOption.update({ where: { id }, data })
    const m = await applyRename(tx, existing.category as Parameters<typeof applyRename>[1], from, to)
    return [u, m] as const
  })

  await logAction(session.user, 'UPDATE', 'ตั้งค่า', `เปลี่ยนชื่อ "${from}" → "${to}"`)
  return NextResponse.json({ ...updated, renamedFrom: from, updatedRows: moved })
}

// ── DELETE: ลบตัวเลือกตั้งค่า — เฉพาะ super admin (กู้คืนได้จากหน้า Log) ─────────
// ลบเฉพาะรายการในลิสต์เท่านั้น ไม่แตะข้อความที่บันทึกไว้บนงานเดิม
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden', message: 'เฉพาะ super admin เท่านั้นที่ลบรายการตั้งค่าได้' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.masterOption.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.masterOption.delete({ where: { id } })
  await logChange(session.user, 'DELETE', 'ตั้งค่า', `ลบตัวเลือก "${existing.value}"`, { refTable: 'MasterOption', refId: id, before: existing })
  return NextResponse.json({ ok: true, id })
}
