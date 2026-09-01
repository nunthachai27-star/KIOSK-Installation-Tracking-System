import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const DOC_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])
const DOC_MAX = 15 * 1024 * 1024 // 15MB

// ── GET: รายการเอกสารของงาน ─────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const rows = await prisma.attachment.findMany({
    where: { refTable: 'JobDoc', refId: id },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, fileName: true, fileType: true, category: true, fileSize: true, uploadedAt: true },
  })
  return NextResponse.json({ documents: rows }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── POST: แนบเอกสารงาน (multipart: file, category) ──────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (!DOC_TYPES.has(file.type) || file.size <= 0 || file.size > DOC_MAX) {
    return NextResponse.json({ error: 'bad file', message: 'รองรับรูป (PNG/JPG/WebP/GIF) หรือ PDF ไม่เกิน 15MB' }, { status: 400 })
  }
  // ชนิดเอกสารแก้ไขได้ (จาก ตั้งค่า › ชนิดเอกสารงาน) — รับข้อความอิสระ, คุมความยาว
  const category = String(form?.get('category') || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'อื่นๆ'

  const att = await saveUpload(file, 'JobDoc', id, session.user.id, category)
  await logAction(session.user, 'CREATE', 'เอกสารงาน', `แนบ ${file.name}`)
  return NextResponse.json({
    ok: true,
    document: { id: att.id, fileName: att.fileName, fileType: att.fileType, category: att.category, fileSize: att.fileSize, uploadedAt: att.uploadedAt },
  }, { status: 201 })
}
