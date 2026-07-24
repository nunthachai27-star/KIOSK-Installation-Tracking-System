import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { IssueStatus, IssueMethod, IssueWarranty } from '@prisma/client'
import { ISSUE_WARRANTY } from '@/lib/issue'

const VALID = new Set<string>(Object.values(IssueStatus))
const METHODS = new Set<string>(Object.values(IssueMethod))
const WARRANTIES = new Set<string>(Object.values(IssueWarranty))

// Timeline events for one issue — loaded on demand when the card's timeline is expanded,
// so the list page doesn't ship every issue's full event history up front.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const events = await prisma.issueEvent.findMany({ where: { issueId: id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(events.map((e) => ({
    id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus,
    note: e.note, actorName: e.actorName, createdAt: e.createdAt.toISOString(),
  })))
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.issue.findUnique({
    where: { id },
    select: { id: true, status: true, solution: true, warrantyState: true },
  })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: {
    title?: string; solution?: string | null; status?: IssueStatus
    warrantyState?: IssueWarranty; method?: IssueMethod | null
    failedSerial?: string | null; replacementSerial?: string | null; cost?: number | null
    assignedToId?: string | null; productType?: string | null; equipment?: string | null
  } = {}
  if (body.productType !== undefined) data.productType = typeof body.productType === 'string' && body.productType.trim() ? body.productType.trim() : null
  if (body.equipment !== undefined) data.equipment = typeof body.equipment === 'string' && body.equipment.trim() ? body.equipment.trim() : null
  if (body.assignedToId !== undefined) data.assignedToId = typeof body.assignedToId === 'string' && body.assignedToId ? body.assignedToId : null
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.solution === 'string') data.solution = body.solution.trim() || null
  if (typeof body.status === 'string' && VALID.has(body.status)) data.status = body.status as IssueStatus
  if (typeof body.warrantyState === 'string' && WARRANTIES.has(body.warrantyState)) data.warrantyState = body.warrantyState as IssueWarranty
  if (body.method === null || (typeof body.method === 'string' && METHODS.has(body.method))) data.method = (body.method || null) as IssueMethod | null
  if (typeof body.failedSerial === 'string') data.failedSerial = body.failedSerial.trim() || null
  if (typeof body.replacementSerial === 'string') data.replacementSerial = body.replacementSerial.trim() || null
  if (body.cost !== undefined) data.cost = body.cost === null || body.cost === '' || isNaN(Number(body.cost)) ? null : Number(body.cost)

  // Record timeline events for meaningful changes.
  const actorName = session.user.name ?? null
  const events: { type: 'STATUS_CHANGED' | 'SOLUTION_UPDATED' | 'WARRANTY_SET'; fromStatus?: IssueStatus; toStatus?: IssueStatus; note?: string | null; actorName: string | null }[] = []
  if (data.status && data.status !== existing.status) {
    events.push({ type: 'STATUS_CHANGED', fromStatus: existing.status, toStatus: data.status, actorName })
  }
  if (data.warrantyState && data.warrantyState !== existing.warrantyState) {
    events.push({ type: 'WARRANTY_SET', note: ISSUE_WARRANTY[data.warrantyState].label, actorName })
  }
  if (data.solution !== undefined && (data.solution ?? '') !== (existing.solution ?? '')) {
    events.push({ type: 'SOLUTION_UPDATED', note: data.solution, actorName })
  }

  const updated = await prisma.issue.update({
    where: { id },
    data: { ...data, ...(events.length ? { events: { create: events } } : {}) },
  })
  await logAction(session.user, 'UPDATE', 'แจ้งปัญหา/เคลม', `แก้ไข "${updated.title}"`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const gone = await prisma.issue.delete({ where: { id }, select: { title: true } }).catch(() => null)
  if (gone) await logAction(session.user, 'DELETE', 'แจ้งปัญหา/เคลม', `ลบ "${gone.title}"`)
  return NextResponse.json({ ok: true })
}
