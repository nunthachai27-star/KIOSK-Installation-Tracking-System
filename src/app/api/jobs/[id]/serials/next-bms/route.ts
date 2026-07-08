import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Compute the next S/N BMS for a job's product type:
//   BMS-{code}{BE-year-2digit}-{running}   e.g. BMS-CIPD69-001
// Running number is scoped to code + year (max existing + 1, min 3 digits).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { productType: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const cfg = await prisma.productBmsCode.findUnique({ where: { productType: job.productType } })
  if (!cfg) return NextResponse.json({ error: 'no-code' }, { status: 400 })

  const yy = String((new Date().getFullYear() + 543) % 100).padStart(2, '0')
  const prefix = `BMS-${cfg.code}${yy}-`

  const rows = await prisma.serialNumber.findMany({
    where: { serialType: 'BMS', serialNo: { startsWith: prefix } },
    select: { serialNo: true },
  })
  let max = 0
  for (const r of rows) {
    const m = r.serialNo.slice(prefix.length).match(/^(\d+)/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  const running = String(max + 1).padStart(3, '0')
  return NextResponse.json({ serialNo: `${prefix}${running}`, code: cfg.code, year: yy })
}
