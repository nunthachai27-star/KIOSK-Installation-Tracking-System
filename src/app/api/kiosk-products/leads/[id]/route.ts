import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { isLeadStatus, LEAD_META, type LeadStatus } from '@/lib/lead'
import { str } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

// ── GET: รายละเอียดผู้สนใจ + ไทม์ไลน์ติดตาม (เจ้าหน้าที่) ─────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const lead = await prisma.kioskLead.findUnique({
    where: { id },
    select: {
      id: true, productName: true, hospital: true, contact: true, phone: true, email: true, note: true, status: true, createdAt: true, updatedAt: true,
      notes: { orderBy: { createdAt: 'asc' }, select: { id: true, actorName: true, toStatus: true, text: true, createdAt: true } },
    },
  })
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    lead: {
      ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString(),
      notes: lead.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// ── PATCH: อัปเดตสถานะ และ/หรือ เพิ่มบันทึกติดตาม (เจ้าหน้าที่) ────────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const cur = await prisma.kioskLead.findUnique({ where: { id }, select: { status: true, hospital: true } })
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const actorName = session.user.name ?? null
  const newStatus: LeadStatus | null = isLeadStatus(b.status) && b.status !== cur.status ? b.status : null
  const note = str(b.note, 1000, { multiline: true }) || null
  if (!newStatus && !note) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const notes: Array<{ actorName: string | null; toStatus?: string; text?: string }> = []
  if (newStatus) notes.push({ actorName, toStatus: newStatus, text: note ?? undefined })
  else if (note) notes.push({ actorName, text: note })

  const updated = await prisma.kioskLead.update({
    where: { id },
    data: { ...(newStatus ? { status: newStatus } : {}), notes: { create: notes } },
    select: {
      id: true, productName: true, hospital: true, contact: true, phone: true, email: true, note: true, status: true, createdAt: true, updatedAt: true,
      notes: { orderBy: { createdAt: 'asc' }, select: { id: true, actorName: true, toStatus: true, text: true, createdAt: true } },
    },
  })
  await logAction(session.user, 'UPDATE', 'ผู้สนใจโปรดัก', newStatus ? `"${cur.hospital}" → ${LEAD_META[newStatus].label}` : `บันทึกติดตาม "${cur.hospital}"`)
  return NextResponse.json({
    ok: true,
    lead: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), notes: updated.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })) },
  })
}
