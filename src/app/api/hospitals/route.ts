import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Create (or reuse) a hospital by name + province — used by the searchable
// hospital picker so office staff can add one without leaving the job form.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { name, province } = await req.json()
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  const cleanName = name.trim()
  const cleanProvince = typeof province === 'string' ? province.trim() : ''

  const existing = await prisma.hospital.findFirst({ where: { name: cleanName, province: cleanProvince } })
  if (existing) return NextResponse.json(existing, { status: 200 })

  const created = await prisma.hospital.create({ data: { name: cleanName, province: cleanProvince } })
  await logAction(session.user, 'CREATE', 'โรงพยาบาล', `เพิ่ม "${created.name}"`)
  return NextResponse.json(created, { status: 201 })
}
