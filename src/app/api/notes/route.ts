import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

const COLORS = new Set(['yellow', 'green', 'blue', 'pink', 'gray'])
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const dateOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null)

// Create a team note. Everyone (OFFICE) may add.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const b = await req.json()
  const body = str(b.body)
  if (!body) return NextResponse.json({ error: 'body required', message: 'กรอกเนื้อหาโน้ต' }, { status: 400 })

  const created = await prisma.note.create({
    data: {
      title: str(b.title),
      body,
      color: typeof b.color === 'string' && COLORS.has(b.color) ? b.color : 'yellow',
      pinned: b.pinned === true,
      link: str(b.link),
      remindAt: dateOrNull(b.remindAt),
      authorId: session.user?.id ?? null,
      authorName: session.user?.name ?? null,
    },
  })
  await logAction(session.user, 'CREATE', 'โน้ต', `เพิ่มโน้ต "${(created.title ?? created.body).slice(0, 40)}"`)
  return NextResponse.json({ id: created.id }, { status: 201 })
}
