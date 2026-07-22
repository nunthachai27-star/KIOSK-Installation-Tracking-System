import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isCategory } from '@/lib/master'
import { applyRename, findCollisions } from '@/lib/master-rename'

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

  // guard against renaming into a duplicate within the same category
  if (data.value && data.value !== existing.value) {
    const dup = await prisma.masterOption.findUnique({
      where: { category_value: { category: existing.category, value: data.value } },
    })
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  }

  // A rename has to reach the copies of this value stored on jobs and product specs,
  // or those rows keep the old text and their spec lookups stop matching.
  const renaming = !!data.value && data.value !== existing.value
  if (!renaming || !isCategory(existing.category)) {
    const updated = await prisma.masterOption.update({ where: { id }, data })
    await logAction(session.user, 'UPDATE', 'ตั้งค่า', `แก้ตัวเลือก "${updated.value}"`)
    return NextResponse.json(updated)
  }

  const from = existing.value
  const to = data.value as string

  const collisions = await findCollisions(prisma, existing.category, to)
  if (collisions.length) {
    return NextResponse.json({
      error: 'collision',
      message: `มีการตั้งค่าของ "${to}" อยู่แล้ว (${collisions.join(', ')}) — เปลี่ยนชื่อทับไม่ได้ ต้องรวมหรือลบของเดิมก่อน`,
    }, { status: 409 })
  }

  const [updated, moved] = await prisma.$transaction(async (tx) => {
    const u = await tx.masterOption.update({ where: { id }, data })
    const m = await applyRename(tx, existing.category as Parameters<typeof applyRename>[1], from, to)
    return [u, m] as const
  })

  await logAction(session.user, 'UPDATE', 'ตั้งค่า', `เปลี่ยนชื่อ "${from}" → "${to}"`)
  return NextResponse.json({ ...updated, renamedFrom: from, updatedRows: moved })
}
