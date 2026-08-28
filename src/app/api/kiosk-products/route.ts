import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { listProducts, str } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

// ── GET (สาธารณะ): รายการโปรดักสำหรับโชว์เคส ─────────────────────────────────
export async function GET() {
  const products = await listProducts()
  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── POST: เจ้าหน้าที่เพิ่มรุ่นใหม่ ────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const name = str(b.name, 160)
  if (name.length < 2) return NextResponse.json({ error: 'name required', message: 'กรุณากรอกชื่อรุ่น' }, { status: 400 })

  const last = await prisma.kioskProduct.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } })
  const created = await prisma.kioskProduct.create({
    data: {
      id: 'kp_' + randomBytes(6).toString('hex'),
      name,
      tagline: str(b.tagline, 200) || null,
      category: str(b.category, 60) || null,
      priceLabel: str(b.priceLabel, 80) || null,
      priceNote: str(b.priceNote, 300) || null,
      features: str(b.features, 3000, { multiline: true }) || null,
      specs: str(b.specs, 2000, { multiline: true }) || null,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  })
  await logAction(session.user, 'CREATE', 'โปรดัก Kiosk', `เพิ่มรุ่น "${name}"`)
  const lines = (s: string | null) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
  return NextResponse.json({
    ok: true,
    product: { id: created.id, name: created.name, tagline: created.tagline, category: created.category, priceLabel: created.priceLabel, priceNote: created.priceNote, features: lines(created.features), specs: lines(created.specs), imageId: null },
  }, { status: 201 })
}
