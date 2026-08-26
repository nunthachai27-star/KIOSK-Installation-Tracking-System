import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isDevType, isDevPriority } from '@/lib/devRequest'
import { str, reqIp, getOrCreateDevToken, serializeRequest, REQUEST_INCLUDE } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

const RATE_MAX = 30 // สร้างคำขอสูงสุดต่อ IP ต่อชั่วโมง (กันสแปม)
const RATE_WINDOW_MS = 3600_000

// ── GET: รายการคำขอทั้งหมด + token ลิงก์ทีมพัฒนา (เจ้าหน้าที่เท่านั้น) ──────────
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [rows, token] = await Promise.all([
    prisma.devRequest.findMany({ orderBy: { createdAt: 'desc' }, include: REQUEST_INCLUDE }),
    getOrCreateDevToken(session.user.name),
  ])
  return NextResponse.json(
    { requests: rows.map(serializeRequest), token },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

// ── POST: สร้างคำขอใหม่ (เจ้าหน้าที่เท่านั้น) ─────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))

  const product = str(b.product, 120)
  const title = str(b.title, 200)
  const detail = str(b.detail, 4000, { multiline: true })
  if (!product || !title || !detail) {
    return NextResponse.json({ error: 'missing', message: 'กรุณากรอกโปรดัก หัวข้อ และรายละเอียดให้ครบ' }, { status: 400 })
  }

  const type = isDevType(b.type) ? b.type : 'BUG'
  const priority = isDevPriority(b.priority) ? b.priority : 'MEDIUM'
  const steps = str(b.steps, 2000, { multiline: true }) || null
  const expected = str(b.expected, 2000, { multiline: true }) || null
  const links = str(b.links, 1000, { multiline: true }) || null
  const ip = reqIp(req)

  if (ip) {
    const recent = await prisma.devRequest.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    })
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'rate limited', message: 'สร้างคำขอถี่เกินไป ลองใหม่ภายหลัง' }, { status: 429 })
    }
  }

  const created = await prisma.devRequest.create({
    data: {
      type, priority, product, title, detail, steps, expected, links,
      reporterName: session.user.name ?? null,
      reporterId: session.user.id ?? null,
      ip,
      events: {
        create: { actor: 'STAFF', actorName: session.user.name ?? null, toStatus: 'NEW', note: 'เปิดคำขอ' },
      },
    },
    include: REQUEST_INCLUDE,
  })
  await logAction(session.user, 'CREATE', 'คำขอพัฒนา', `เปิดคำขอ "${title}"`)
  return NextResponse.json({ ok: true, request: serializeRequest(created) }, { status: 201 })
}
