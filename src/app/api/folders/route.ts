import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Create a folder to group team files into parts.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'name required', message: 'ตั้งชื่อโฟลเดอร์' }, { status: 400 })
  const created = await prisma.fileFolder.create({ data: { name, createdByName: session.user.name ?? null } })
  await logAction(session.user, 'CREATE', 'ไฟล์ทีม', `สร้างโฟลเดอร์ "${name}"`)
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 })
}
