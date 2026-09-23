import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logChange } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\r\n?/g, '\n').replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
    .split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}

// ── POST: เพิ่มงานสรุปพิมพ์เองของตัวเอง (เจ้าหน้าที่) ─────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE' || !session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const dateKey = typeof b.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.dateKey) ? b.dateKey : ''
  const heading = clean(b.heading, 200)
  const detail = clean(b.detail, 4000)
  if (!dateKey || !heading) {
    return NextResponse.json({ error: 'missing', message: 'กรุณากรอกหัวข้อ' }, { status: 400 })
  }

  const created = await prisma.reportEntry.create({
    data: { userId: session.user.id, userName: session.user.name ?? null, dateKey, heading, detail },
  })
  await logChange(session.user, 'CREATE', 'สรุปงาน (พิมพ์เอง)', `${heading} (${dateKey})`, { refTable: 'ReportEntry', refId: created.id, after: created })
  return NextResponse.json({ ok: true, entry: { id: created.id, heading: created.heading, detail: created.detail } }, { status: 201 })
}
