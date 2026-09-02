import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Rename / edit a hospital. The name change propagates to every job via the FK,
// so no data migration is needed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const data: { name?: string; province?: string; code?: string | null; address?: string | null } = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    data.name = body.name.trim()
  }
  if (typeof body.province === 'string') data.province = body.province.trim()
  if (body.code !== undefined) data.code = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : null
  if (body.address !== undefined) data.address = typeof body.address === 'string' && body.address.trim() ? body.address.trim() : null

  // ผู้ติดต่อ (ถ้าส่งมา = แทนที่ทั้งชุด) — คุมความยาว, ตัดแถวที่ไม่มีชื่อ
  const hasContacts = Array.isArray(body.contacts)
  const clean = (s: unknown, n: number) => (typeof s === 'string' ? s.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '')
  const contacts = hasContacts
    ? (body.contacts as unknown[]).map((c) => {
        const o = c as Record<string, unknown>
        return { name: clean(o.name, 120), phone: clean(o.phone, 40), position: clean(o.position, 80), note: clean(o.note, 200) }
      }).filter((c) => c.name)
    : []

  if (!Object.keys(data).length && !hasContacts) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const exists = await prisma.hospital.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.hospital.update({ where: { id }, data })
    if (hasContacts) {
      await tx.hospitalContact.deleteMany({ where: { hospitalId: id } })
      if (contacts.length) await tx.hospitalContact.createMany({ data: contacts.map((c, i) => ({ hospitalId: id, sortOrder: i, ...c })) })
    }
  })
  const updated = await prisma.hospital.findUnique({ where: { id }, include: { contacts: { orderBy: { sortOrder: 'asc' } } } })
  await logAction(session.user, 'UPDATE', 'โรงพยาบาล', `แก้ไข "${updated?.name ?? ''}"`)
  return NextResponse.json(updated)
}

// Delete a hospital only when it has no jobs (otherwise it's referenced data).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const jobCount = await prisma.job.count({ where: { hospitalId: id } })
  if (jobCount > 0) return NextResponse.json({ error: 'has_jobs', jobCount }, { status: 409 })

  const gone = await prisma.hospital.delete({ where: { id }, select: { name: true } }).catch(() => null)
  if (gone) await logAction(session.user, 'DELETE', 'โรงพยาบาล', `ลบ "${gone.name}"`)
  return NextResponse.json({ ok: true })
}
