import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { str, reqIp } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

const RATE_MAX = 20            // ส่งความสนใจสูงสุดต่อ IP ต่อชั่วโมง
const RATE_WINDOW_MS = 3600_000

// ── POST (สาธารณะ): ผู้สนใจส่งข้อมูลติดต่อ ────────────────────────────────────
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  // Honeypot: ช่องซ่อน — บอทมักกรอก
  if (str(b.website, 200)) return NextResponse.json({ ok: true }, { status: 201 })

  const hospital = str(b.hospital, 160)
  if (hospital.length < 2) {
    return NextResponse.json({ error: 'hospital required', message: 'กรุณากรอกชื่อโรงพยาบาล/หน่วยงาน' }, { status: 400 })
  }
  const contact = str(b.contact, 120) || null
  const phone = str(b.phone, 40) || null
  const email = str(b.email, 160) || null
  const note = str(b.note, 1000, { multiline: true }) || null
  const productId = str(b.productId, 60) || null
  const productName = str(b.productName, 160) || null
  const ip = reqIp(req)

  if (ip) {
    const recent = await prisma.kioskLead.count({ where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } } })
    if (recent >= RATE_MAX) return NextResponse.json({ error: 'rate limited', message: 'ส่งบ่อยเกินไป ลองใหม่ภายหลัง' }, { status: 429 })
  }

  await prisma.kioskLead.create({ data: { productId, productName, hospital, contact, phone, email, note, ip } })
  return NextResponse.json({ ok: true, message: 'ส่งข้อมูลเรียบร้อย ทีมงานจะติดต่อกลับโดยเร็ว' }, { status: 201 })
}
