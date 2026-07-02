import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.masterOption.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const data: { value?: string; active?: boolean } = {}
  if (typeof body.value === 'string' && body.value.trim()) data.value = body.value.trim()
  if (typeof body.active === 'boolean') data.active = body.active

  // guard against renaming into a duplicate within the same category
  if (data.value && data.value !== existing.value) {
    const dup = await prisma.masterOption.findUnique({
      where: { category_value: { category: existing.category, value: data.value } },
    })
    if (dup) return NextResponse.json({ error: 'มีรายการนี้อยู่แล้ว' }, { status: 409 })
  }

  const updated = await prisma.masterOption.update({ where: { id }, data })
  return NextResponse.json(updated)
}
