import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.productChecklistItem.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: { label?: string; active?: boolean } = {}
  if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim()
  if (typeof body.active === 'boolean') data.active = body.active

  if (data.label && data.label !== existing.label) {
    const dup = await prisma.productChecklistItem.findUnique({
      where: { productType_label: { productType: existing.productType, label: data.label } },
    })
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  }

  const updated = await prisma.productChecklistItem.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.productChecklistItem.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
