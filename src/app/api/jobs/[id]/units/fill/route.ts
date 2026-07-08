import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_FILL = 100

// Create BMS units so the count matches the job's quantity, auto-numbering with
// the product's BMS code. Returns the created unit rows.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { productType: true, quantity: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const existing = await prisma.serialNumber.count({ where: { jobId: id, serialType: 'BMS' } })
  const needed = job.quantity - existing
  if (needed <= 0) return NextResponse.json({ created: [], reason: 'complete' })
  if (needed > MAX_FILL) return NextResponse.json({ error: 'too-many', needed }, { status: 400 })

  const cfg = await prisma.productBmsCode.findUnique({ where: { productType: job.productType } })
  if (!cfg) return NextResponse.json({ error: 'no-code' }, { status: 400 })

  const yy = String((new Date().getFullYear() + 543) % 100).padStart(2, '0')
  const prefix = `BMS-${cfg.code}${yy}-`
  const rows = await prisma.serialNumber.findMany({ where: { serialType: 'BMS', serialNo: { startsWith: prefix } }, select: { serialNo: true } })
  let max = 0
  for (const r of rows) {
    const m = r.serialNo.slice(prefix.length).match(/^(\d+)/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }

  const created = []
  for (let i = 1; i <= needed; i++) {
    const serialNo = `${prefix}${String(max + i).padStart(3, '0')}`
    created.push(await prisma.serialNumber.create({ data: { jobId: id, serialType: 'BMS', serialNo } }))
  }
  return NextResponse.json({ created })
}
