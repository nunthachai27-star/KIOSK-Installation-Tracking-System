import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const RATE_MAX = 25             // จำนวน "รพ. ใหม่" สูงสุดต่อ IP ต่อชั่วโมง (กันสแปมสร้างชื่อรัว)
const RATE_WINDOW_MS = 3600_000

function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[ -]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

// (สาธารณะ) โรงพยาบาลกรอกชื่อผ่านประตู → บันทึกทะเบียนทันที (ขึ้น log ตั้งแต่ลงทะเบียน).
// ชื่อเดิมที่เคยลงทะเบียน = อัปเดตเวลาเข้าใช้ล่าสุด (ไม่สร้างซ้ำ).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  if (str(b.website, 200)) return NextResponse.json({ ok: true }, { status: 201 }) // honeypot

  const name = str(b.hospital, 120)
  if (name.length < 2) {
    return NextResponse.json({ error: 'hospital required', message: 'กรุณากรอกชื่อโรงพยาบาล' }, { status: 400 })
  }

  const xff = req.headers.get('x-forwarded-for')
  const ip = (req.headers.get('x-real-ip') || xff?.split(',').pop() || '').trim() || null

  const existing = await prisma.kioskHospital.findUnique({ where: { name }, select: { id: true } })
  if (!existing && ip) {
    const recent = await prisma.kioskHospital.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    })
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'rate limited', message: 'ลงทะเบียนบ่อยเกินไป ลองใหม่ภายหลัง' }, { status: 429 })
    }
  }

  await prisma.kioskHospital.upsert({
    where: { name },
    create: { name, ip },
    update: { lastSeenAt: new Date() },
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}
