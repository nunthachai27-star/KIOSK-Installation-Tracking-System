import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const HTML_MAX = 2 * 1024 * 1024 // 2MB ต่อสำเนา

// รายการสำเนาที่บันทึกไว้ (ใหม่ → เก่า)
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const rows = await prisma.shipReportCopy.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, year: true, month: true, method: true, title: true, createdByName: true, createdAt: true, createdById: true },
  })
  return NextResponse.json({ copies: rows }, { headers: { 'Cache-Control': 'no-store' } })
}

// บันทึกสำเนาใหม่
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const year = Number(body?.year), month = Number(body?.month)
  const method = String(body?.method || '').trim().slice(0, 120)
  const title = String(body?.title || '').trim().slice(0, 120)
  const html = String(body?.html || '')
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11 || !title || !html) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  if (html.length > HTML_MAX) return NextResponse.json({ error: 'too large', message: 'สำเนาใหญ่เกินไป' }, { status: 413 })

  const created = await prisma.shipReportCopy.create({
    data: { year, month, method, title, html, createdById: session.user.id, createdByName: session.user.name ?? null },
    select: { id: true, year: true, month: true, method: true, title: true, createdByName: true, createdAt: true, createdById: true },
  })
  await logAction(session.user, 'CREATE', 'สำเนารายงานค่าขนส่ง', `บันทึกสำเนา ${title}`)
  return NextResponse.json({ ok: true, copy: created }, { status: 201 })
}
