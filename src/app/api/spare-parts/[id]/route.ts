import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.sparePart.findUnique({ where: { id }, select: { id: true, stockQty: true } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const b = await req.json()
  const data: Prisma.SparePartUpdateInput = {}
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim()
  if (b.category !== undefined) data.category = typeof b.category === 'string' && b.category.trim() ? b.category.trim() : null
  if (b.sellPrice !== undefined) data.sellPrice = toNum(b.sellPrice)
  if (b.serviceFee1 !== undefined) data.serviceFee1 = toNum(b.serviceFee1)
  if (b.serviceFee2 !== undefined) data.serviceFee2 = toNum(b.serviceFee2)
  if (b.requiresOnsite !== undefined) data.requiresOnsite = Boolean(b.requiresOnsite)
  if (b.imageUrl !== undefined) data.imageUrl = typeof b.imageUrl === 'string' && b.imageUrl.trim() ? b.imageUrl.trim() : null
  if (b.remark !== undefined) data.remark = typeof b.remark === 'string' && b.remark.trim() ? b.remark.trim() : null
  // Absolute stock set, or relative adjust (+/-), never below 0.
  if (b.stockQty !== undefined && Number.isFinite(Number(b.stockQty))) data.stockQty = Math.max(0, Math.trunc(Number(b.stockQty)))
  else if (b.stockDelta !== undefined && Number.isFinite(Number(b.stockDelta))) {
    data.stockQty = Math.max(0, existing.stockQty + Math.trunc(Number(b.stockDelta)))
  }

  const updated = await prisma.sparePart.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.sparePart.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
