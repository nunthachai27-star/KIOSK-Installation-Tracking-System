import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const IMG_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const IMG_MAX = 15 * 1024 * 1024 // 15MB
// ประเภทรูปเคลม — คงที่ 2 แบบ (ของส่งเคลม / ของรับคืน)
const IMG_CATS = new Set(['ส่งเคลม', 'รับคืน'])

// ── GET: รูปอุปกรณ์ที่เคลมของรายการนี้ ────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const rows = await prisma.attachment.findMany({
    where: { refTable: 'IssueImg', refId: id },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, fileName: true, fileType: true, fileSize: true, uploadedAt: true, category: true },
  })
  return NextResponse.json({ images: rows }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── POST: แนบรูปอุปกรณ์ที่เคลม (multipart: file) ──────────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true } })
  if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (!IMG_TYPES.has(file.type) || file.size <= 0 || file.size > IMG_MAX) {
    return NextResponse.json({ error: 'bad file', message: 'รองรับรูปภาพ (PNG/JPG/WebP/GIF) ไม่เกิน 15MB' }, { status: 400 })
  }

  const catRaw = String(form?.get('category') || '').trim()
  const category = IMG_CATS.has(catRaw) ? catRaw : 'ส่งเคลม'

  const att = await saveUpload(file, 'IssueImg', id, session.user.id, category)
  await logAction(session.user, 'CREATE', 'รูปเคลม', `แนบรูป (${category}) ${file.name}`)
  return NextResponse.json({
    ok: true,
    image: { id: att.id, fileName: att.fileName, fileType: att.fileType, fileSize: att.fileSize, uploadedAt: att.uploadedAt, category: att.category },
  }, { status: 201 })
}
