import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.productComponent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: { name?: string; quantity?: number; needsSerial?: boolean; active?: boolean } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (Number.isFinite(body.quantity) && body.quantity > 0) data.quantity = Math.floor(body.quantity)
  if (typeof body.needsSerial === 'boolean') data.needsSerial = body.needsSerial
  if (typeof body.active === 'boolean') data.active = body.active

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.productComponent.findUnique({
      where: { productType_name: { productType: existing.productType, name: data.name } },
    })
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  }

  const updated = await prisma.productComponent.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.productComponent.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
