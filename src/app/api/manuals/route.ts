import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listManuals } from '@/lib/manualServer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ manuals: await listManuals() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const created = await prisma.manual.create({
    data: {
      title: title.slice(0, 200),
      description: body?.description ? String(body.description).slice(0, 2000) : null,
      category: body?.category ? String(body.category).slice(0, 100) : null,
      linkUrl: body?.linkUrl ? String(body.linkUrl).slice(0, 1000) : null,
      token: randomUUID().replace(/-/g, ''),
    },
  })
  return NextResponse.json(created, { status: 201 })
}
