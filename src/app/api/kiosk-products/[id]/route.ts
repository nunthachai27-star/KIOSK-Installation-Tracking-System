import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { str } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

const lines = (s: string | null) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean)

// ── PATCH: เจ้าหน้าที่แก้ไขรุ่น ───────────────────────────────────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const cur = await prisma.kioskProduct.findUnique({ where: { id }, select: { id: true } })
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const data: Record<string, unknown> = {}
  if (typeof b.name === 'string') { const n = str(b.name, 160); if (n.length < 2) return NextResponse.json({ error: 'name required', message: 'กรุณากรอกชื่อรุ่น' }, { status: 400 }); data.name = n }
  if (typeof b.tagline === 'string') data.tagline = str(b.tagline, 200) || null
  if (typeof b.category === 'string') data.category = str(b.category, 60) || null
  if (typeof b.priceLabel === 'string') data.priceLabel = str(b.priceLabel, 80) || null
  if (typeof b.priceNote === 'string') data.priceNote = str(b.priceNote, 300) || null
  if (typeof b.features === 'string') data.features = str(b.features, 3000, { multiline: true }) || null
  if (typeof b.specs === 'string') data.specs = str(b.specs, 2000, { multiline: true }) || null
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const p = await prisma.kioskProduct.update({ where: { id }, data })
  await logAction(session.user, 'UPDATE', 'โปรดัก Kiosk', `แก้ไขรุ่น "${p.name}"`)
  const img = await prisma.attachment.findFirst({ where: { refTable: 'KioskProduct', refId: id }, orderBy: { uploadedAt: 'desc' }, select: { id: true } })
  return NextResponse.json({
    ok: true,
    product: { id: p.id, name: p.name, tagline: p.tagline, category: p.category, priceLabel: p.priceLabel, priceNote: p.priceNote, features: lines(p.features), specs: lines(p.specs), imageId: img?.id ?? null },
  })
}

// ── DELETE: เจ้าหน้าที่ลบรุ่น (ยืนยันฝั่งหน้าเว็บก่อน) ─────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const row = await prisma.kioskProduct.findUnique({ where: { id }, select: { name: true } })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await prisma.attachment.deleteMany({ where: { refTable: 'KioskProduct', refId: id } })
  await prisma.kioskProduct.delete({ where: { id } })
  await logAction(session.user, 'DELETE', 'โปรดัก Kiosk', `ลบรุ่น "${row.name}"`)
  return NextResponse.json({ ok: true, id })
}
