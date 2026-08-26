import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

// ── รูปแนบ (ใช้ตาราง Attachment เดิม, refTable = 'DevRequest') ────────────────
export const DEV_IMG_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
export const DEV_IMG_MAX = 8 * 1024 * 1024 // 8MB ต่อรูป

export function isDevImage(type: string, size: number): boolean {
  return DEV_IMG_TYPES.has(type) && size > 0 && size <= DEV_IMG_MAX
}

// โหลดรูปของคำขอหลายรายการทีเดียว (id + ชนิด — หน้าเว็บสร้าง URL เอง)
export async function loadImages(requestIds: string[]): Promise<Map<string, { id: string; type: string }[]>> {
  const m = new Map<string, { id: string; type: string }[]>()
  if (!requestIds.length) return m
  const atts = await prisma.attachment.findMany({
    where: { refTable: 'DevRequest', refId: { in: requestIds } },
    orderBy: { uploadedAt: 'asc' },
    select: { id: true, refId: true, fileType: true },
  })
  for (const a of atts) {
    const arr = m.get(a.refId) ?? []
    arr.push({ id: a.id, type: a.fileType })
    m.set(a.refId, arr)
  }
  return m
}

// เสิร์ฟรูปของแถบพัฒนา — เฉพาะไฟล์รูปที่อยู่ใต้ /uploads และผูกกับ DevRequest เท่านั้น
// (ใช้ได้ทั้งฝั่งเจ้าหน้าที่และลิงก์ทีมพัฒนา — กันเปิดไฟล์อื่นในระบบ).
export async function serveDevImage(attId: string): Promise<Response> {
  const att = await prisma.attachment.findUnique({ where: { id: attId } })
  if (!att || att.refTable !== 'DevRequest' || !DEV_IMG_TYPES.has(att.fileType) || !att.filePath.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, '')))
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': att.fileType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(att.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=86400',
    },
  })
}

// ── ตัวช่วยฝั่งเซิร์ฟเวอร์ของแถบ "พัฒนา" ────────────────────────────────────

// ตัดอักขระควบคุม (คง \n ไว้เมื่อ multiline) แล้วคุมความยาว.
export function str(v: unknown, max: number, opts?: { multiline?: boolean }): string {
  if (typeof v !== 'string') return ''
  // \r\n → \n แล้วลบอักขระควบคุมทั้งหมดยกเว้น \n (\x0A)
  const s = v.replace(/\r\n?/g, '\n').replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
  if (opts?.multiline) {
    return s
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max)
  }
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

// IP ผู้ร้องขอ: x-real-ip (proxy ตั้ง) ก่อน — leftmost ของ x-forwarded-for ปลอมได้ ใช้ตัวขวาสุด.
export function reqIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  return (req.headers.get('x-real-ip') || xff?.split(',').pop() || '').trim() || null
}

// token ลับใบเดียวสำหรับลิงก์ทีมพัฒนา — สร้างถ้ายังไม่มี.
export async function getOrCreateDevToken(createdBy?: string | null): Promise<string> {
  const existing = await prisma.devBoardToken.findFirst({ orderBy: { createdAt: 'desc' } })
  if (existing) return existing.token
  const token = randomBytes(24).toString('hex')
  await prisma.devBoardToken.create({ data: { token, createdBy: createdBy ?? null } })
  return token
}

// ตั้งค่าบอร์ด (token + โน้ตทีมพัฒนา) — สร้าง token ถ้ายังไม่มี.
export async function getDevSettings(createdBy?: string | null): Promise<{ token: string; teamNote: string | null }> {
  const existing = await prisma.devBoardToken.findFirst({ orderBy: { createdAt: 'desc' } })
  if (existing) return { token: existing.token, teamNote: existing.teamNote }
  const token = randomBytes(24).toString('hex')
  const row = await prisma.devBoardToken.create({ data: { token, createdBy: createdBy ?? null } })
  return { token: row.token, teamNote: row.teamNote }
}

// อ่านโน้ตทีมพัฒนาจาก token (ฝั่งสาธารณะ).
export async function teamNoteFor(token: string): Promise<string | null> {
  const row = await prisma.devBoardToken.findUnique({ where: { token }, select: { teamNote: true } })
  return row?.teamNote ?? null
}

// ตั้งโน้ตทีมพัฒนา (เจ้าหน้าที่).
export async function setTeamNote(note: string | null, createdBy?: string | null): Promise<void> {
  const existing = await prisma.devBoardToken.findFirst({ orderBy: { createdAt: 'desc' } })
  if (existing) await prisma.devBoardToken.update({ where: { id: existing.id }, data: { teamNote: note } })
  else await prisma.devBoardToken.create({ data: { token: randomBytes(24).toString('hex'), teamNote: note, createdBy: createdBy ?? null } })
}

// สร้าง token ใหม่ (revoke ของเดิมทั้งหมด) — ใช้ตอนลิงก์รั่ว. คงโน้ตเดิมไว้.
export async function rotateDevToken(createdBy?: string | null): Promise<string> {
  const prev = await prisma.devBoardToken.findFirst({ orderBy: { createdAt: 'desc' }, select: { teamNote: true } })
  const token = randomBytes(24).toString('hex')
  await prisma.$transaction([
    prisma.devBoardToken.deleteMany({}),
    prisma.devBoardToken.create({ data: { token, teamNote: prev?.teamNote ?? null, createdBy: createdBy ?? null } }),
  ])
  return token
}

// ตรวจว่า token ถูกต้อง (สำหรับหน้า/แอปพีไอสาธารณะของทีมพัฒนา).
export async function isValidDevToken(token: string): Promise<boolean> {
  if (!token || token.length < 20 || token.length > 80) return false
  const row = await prisma.devBoardToken.findUnique({ where: { token }, select: { id: true } })
  return !!row
}

type EventRow = {
  id: string
  actor: string
  actorName: string | null
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  createdAt: Date
}
type RequestRow = {
  id: string
  code: number
  type: string
  priority: string
  status: string
  product: string
  title: string
  detail: string
  steps: string | null
  expected: string | null
  links: string | null
  reporterName: string | null
  createdAt: Date
  updatedAt: Date
  events: EventRow[]
}

// แปลงเป็น JSON ที่ส่งให้หน้าเว็บ — ตัด ip/reporterId ออก (ไม่เปิดเผยสาธารณะ).
export function serializeRequest(r: RequestRow) {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    priority: r.priority,
    status: r.status,
    product: r.product,
    title: r.title,
    detail: r.detail,
    steps: r.steps,
    expected: r.expected,
    links: r.links,
    reporterName: r.reporterName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    events: r.events.map((e) => ({
      id: e.id,
      actor: e.actor,
      actorName: e.actorName,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

export const REQUEST_INCLUDE = {
  events: { orderBy: { createdAt: 'asc' as const } },
}

// serialize + แนบรูป (batch) — สำหรับรายการหลายคำขอ
export async function serializeWithImages(rows: RequestRow[]) {
  const imgs = await loadImages(rows.map((r) => r.id))
  return rows.map((r) => ({ ...serializeRequest(r), images: imgs.get(r.id) ?? [] }))
}

// serialize + แนบรูป — สำหรับคำขอเดียว (ตอบหลัง create/update)
export async function serializeOneWithImages(row: RequestRow) {
  const imgs = await loadImages([row.id])
  return { ...serializeRequest(row), images: imgs.get(row.id) ?? [] }
}
