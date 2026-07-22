import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Rename / edit a hospital. The name change propagates to every job via the FK,
// so no data migration is needed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const data: { name?: string; province?: string; code?: string | null } = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    data.name = body.name.trim()
  }
  if (typeof body.province === 'string') data.province = body.province.trim()
  if (body.code !== undefined) data.code = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : null
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const updated = await prisma.hospital.update({ where: { id }, data }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

// Delete a hospital only when it has no jobs (otherwise it's referenced data).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const jobCount = await prisma.job.count({ where: { hospitalId: id } })
  if (jobCount > 0) return NextResponse.json({ error: 'has_jobs', jobCount }, { status: 409 })

  await prisma.hospital.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
