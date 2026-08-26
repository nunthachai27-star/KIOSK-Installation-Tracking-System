import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'
import { isDevImage } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── POST: เจ้าหน้าที่แนบรูปให้คำขอ (multipart: file) ─────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const exists = await prisma.devRequest.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (!isDevImage(file.type, file.size)) {
    return NextResponse.json({ error: 'bad file', message: 'รองรับเฉพาะรูปภาพ (PNG/JPG/WebP/GIF) ไม่เกิน 8MB' }, { status: 400 })
  }

  const att = await saveUpload(file, 'DevRequest', id, session.user.id)
  return NextResponse.json({ ok: true, image: { id: att.id, type: att.fileType } }, { status: 201 })
}
