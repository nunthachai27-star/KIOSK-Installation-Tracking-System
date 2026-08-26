import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isDevStatus } from '@/lib/devRequest'
import { str, reqIp, isValidDevToken, serializeOneWithImages, REQUEST_INCLUDE } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

const RATE_MAX = 60 // อัปเดตสูงสุดต่อ IP ต่อชั่วโมง
const RATE_WINDOW_MS = 3600_000

// ── POST (สาธารณะผ่าน token): ทีมพัฒนาเปลี่ยนสถานะ / คอมเมนต์เท่านั้น ──────────
// ทำได้แค่: อัปเดต status และ/หรือ เพิ่ม note — ห้ามแก้เนื้อหา/ลบ/สร้าง.
export async function POST(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params
  if (!(await isValidDevToken(token))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  // Honeypot: ช่องซ่อน — บอทมักกรอก ถ้ามีค่าให้เงียบ ๆ ตอบ ok
  if (str(b.website, 200)) return NextResponse.json({ ok: true })

  const cur = await prisma.devRequest.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const devName = str(b.devName, 60) || 'ทีมพัฒนา'
  const note = str(b.note, 2000, { multiline: true }) || null
  const newStatus = isDevStatus(b.status) && b.status !== cur.status ? b.status : null

  if (!newStatus && !note) {
    return NextResponse.json({ error: 'nothing to update', message: 'กรุณาเปลี่ยนสถานะหรือใส่คอมเมนต์' }, { status: 400 })
  }

  // rate limit ต่อ IP (นับเหตุการณ์ของทีมพัฒนาที่ผ่านมา)
  const ip = reqIp(req)
  if (ip) {
    const recent = await prisma.devRequestEvent.count({
      where: { actor: 'DEV', createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    })
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'rate limited', message: 'อัปเดตถี่เกินไป ลองใหม่ภายหลัง' }, { status: 429 })
    }
  }

  const data: Record<string, unknown> = {}
  if (newStatus) data.status = newStatus
  data.events = {
    create: newStatus
      ? { actor: 'DEV', actorName: devName, fromStatus: cur.status, toStatus: newStatus, note }
      : { actor: 'DEV', actorName: devName, note },
  }

  const updated = await prisma.devRequest.update({ where: { id }, data, include: REQUEST_INCLUDE })
  return NextResponse.json({ ok: true, request: await serializeOneWithImages(updated) })
}
