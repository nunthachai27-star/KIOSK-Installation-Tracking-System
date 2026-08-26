import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'
import { isValidDevToken, isDevImage, reqIp } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

const RATE_MAX = 40 // อัปโหลดรูปสูงสุดต่อ IP ต่อชั่วโมง (ฝั่งทีมพัฒนา)
const RATE_WINDOW_MS = 3600_000

// ── POST (สาธารณะผ่าน token): ทีมพัฒนาแนบรูปให้คำขอ (multipart: file) ─────────
export async function POST(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params
  if (!(await isValidDevToken(token))) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const exists = await prisma.devRequest.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const ip = reqIp(req)
  if (ip) {
    const recent = await prisma.attachment.count({
      where: { refTable: 'DevRequest', uploadedById: null, uploadedAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    })
    if (recent >= RATE_MAX) return NextResponse.json({ error: 'rate limited', message: 'อัปโหลดถี่เกินไป ลองใหม่ภายหลัง' }, { status: 429 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (!isDevImage(file.type, file.size)) {
    return NextResponse.json({ error: 'bad file', message: 'รองรับเฉพาะรูปภาพ (PNG/JPG/WebP/GIF) ไม่เกิน 8MB' }, { status: 400 })
  }

  const att = await saveUpload(file, 'DevRequest', id) // ไม่มี userId (ทีมพัฒนาผ่านลิงก์)
  return NextResponse.json({ ok: true, image: { id: att.id, type: att.fileType } }, { status: 201 })
}
