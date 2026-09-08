import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Impact = { label: string; count?: number; tone?: 'danger' | 'warn' | 'ok' }

// ── ตรวจ "ผลกระทบ" ก่อนลบ/แก้รายการต่างๆ ทั่วเว็บ ────────────────────────────
// GET /api/impact?type=<ชนิด>&id=<ไอดี>  →  { impacts, message }
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? ''
  const id = searchParams.get('id') ?? ''
  const impacts: Impact[] = []
  let message = ''

  switch (type) {
    case 'hospital': {
      const [jobs, stock, contacts] = await Promise.all([
        prisma.job.count({ where: { hospitalId: id } }),
        prisma.stockItem.count({ where: { hospitalId: id } }),
        prisma.hospitalContact.count({ where: { hospitalId: id } }),
      ])
      if (jobs > 0) impacts.push({ label: 'งานที่ผูกกับโรงพยาบาลนี้', count: jobs, tone: 'danger' })
      if (stock > 0) impacts.push({ label: 'สต็อกที่ระบุโรงพยาบาลนี้ (จะถูกปลดการเชื่อม)', count: stock, tone: 'warn' })
      if (contacts > 0) impacts.push({ label: 'ผู้ติดต่อของโรงพยาบาลนี้ (จะถูกลบ)', count: contacts, tone: 'warn' })
      message = jobs > 0
        ? 'โรงพยาบาลนี้มีงานอ้างอิงอยู่ — ระบบจะไม่ยอมให้ลบ ต้องย้ายงานไปโรงพยาบาลอื่นก่อน'
        : impacts.length ? 'ตรวจสอบผลกระทบก่อนลบ' : 'โรงพยาบาลนี้ยังไม่มีงาน/สต็อก/ผู้ติดต่อผูกอยู่ ลบได้ปลอดภัย'
      break
    }
    case 'productType': {
      // id = ชื่อประเภทสินค้า
      const [jobs, components] = await Promise.all([
        prisma.job.count({ where: { productType: id } }),
        prisma.productComponent.count({ where: { productType: id } }),
      ])
      if (jobs > 0) impacts.push({ label: 'งานที่เป็นประเภทสินค้านี้', count: jobs, tone: 'danger' })
      if (components > 0) impacts.push({ label: 'อุปกรณ์ในชุด (BOM) ของประเภทนี้', count: components, tone: 'warn' })
      message = impacts.length ? 'ตรวจสอบผลกระทบก่อนลบ/เปลี่ยนชื่อประเภทสินค้า' : 'ประเภทสินค้านี้ยังไม่มีงาน/อุปกรณ์ผูกอยู่'
      break
    }
    default:
      return NextResponse.json({ error: 'unknown type' }, { status: 400 })
  }

  return NextResponse.json({ impacts, message }, { headers: { 'Cache-Control': 'no-store' } })
}
