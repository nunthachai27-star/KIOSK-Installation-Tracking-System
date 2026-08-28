import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'
import { logAction } from '@/lib/audit'
import { isProductImage } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

// ── POST: เจ้าหน้าที่อัปโหลดรูปโปรดัก (แทนที่รูปเดิม) ─────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const prod = await prisma.kioskProduct.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!prod) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (!isProductImage(file.type, file.size)) {
    return NextResponse.json({ error: 'bad file', message: 'รองรับเฉพาะรูปภาพ (PNG/JPG/WebP/GIF) ไม่เกิน 8MB' }, { status: 400 })
  }

  // ลบรูปเดิมของโปรดักนี้ก่อน (เก็บรูปเดียว)
  await prisma.attachment.deleteMany({ where: { refTable: 'KioskProduct', refId: id } })
  const att = await saveUpload(file, 'KioskProduct', id, session.user.id)
  await logAction(session.user, 'UPDATE', 'โปรดัก Kiosk', `เปลี่ยนรูป "${prod.name}"`)
  return NextResponse.json({ ok: true, imageId: att.id }, { status: 201 })
}
