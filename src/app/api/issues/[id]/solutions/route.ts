import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

const dateOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null)

// List the resolution-timeline entries for a claim (oldest first).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const rows = await prisma.issueSolution.findMany({ where: { issueId: id }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(rows.map((r) => ({ id: r.id, date: r.date.toISOString(), text: r.text, authorName: r.authorName })))
}

// Add one resolution step (date + text).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const text = typeof b.text === 'string' ? b.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'text required', message: 'พิมพ์วิธีการแก้ไข' }, { status: 400 })
  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true } })
  if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const created = await prisma.issueSolution.create({
    data: { issueId: id, date: dateOrNull(b.date) ?? new Date(), text, authorName: session.user?.name ?? null },
  })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/เคลม', `เพิ่มวิธีแก้ไข "${text.slice(0, 40)}"`)
  return NextResponse.json({ id: created.id, date: created.date.toISOString(), text: created.text, authorName: created.authorName }, { status: 201 })
}
