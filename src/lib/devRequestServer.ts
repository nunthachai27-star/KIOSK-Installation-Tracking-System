import { randomBytes } from 'node:crypto'
import { prisma } from './prisma'

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

// สร้าง token ใหม่ (revoke ของเดิมทั้งหมด) — ใช้ตอนลิงก์รั่ว.
export async function rotateDevToken(createdBy?: string | null): Promise<string> {
  const token = randomBytes(24).toString('hex')
  await prisma.$transaction([
    prisma.devBoardToken.deleteMany({}),
    prisma.devBoardToken.create({ data: { token, createdBy: createdBy ?? null } }),
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
