import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LIMIT = 50
const MIN_LEN = 2

// Serial lookup for the stock dashboard search box: find individual units by
// Serial NO. / S/N BMS across every product, so the user does not have to open
// a product first to know which one holds the serial.
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  if (q.length < MIN_LEN) return NextResponse.json({ items: [], total: 0 })

  const where = {
    OR: [
      { serialBMS: { contains: q, mode: 'insensitive' as const } },
      { serialNo: { contains: q, mode: 'insensitive' as const } },
    ],
  }

  const [rows, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      take: LIMIT,
      orderBy: [{ serialBMS: 'asc' }, { serialNo: 'asc' }],
      include: {
        lot: { select: { lotCode: true, product: { select: { id: true, name: true, group: true } } } },
        hospital: { select: { name: true } },
        job: { select: { id: true, jobCode: true } },
        // The open loan, so a borrowed unit shows who has it.
        loans: { where: { status: 'BORROWED' }, select: { borrowerName: true, borrowerPhone: true }, take: 1 },
      },
    }),
    prisma.stockItem.count({ where }),
  ])

  return NextResponse.json({
    total,
    items: rows.map((it) => ({
      id: it.id,
      serialBMS: it.serialBMS,
      serialNo: it.serialNo,
      color: it.color,
      status: it.status,
      lotCode: it.lot.lotCode,
      productId: it.lot.product.id,
      productName: it.lot.product.name,
      group: it.lot.product.group,
      hospitalName: it.hospital?.name ?? it.hospitalName ?? null,
      jobId: it.job?.id ?? null,
      jobCode: it.job?.jobCode ?? null,
      borrowerName: it.loans[0]?.borrowerName ?? null,
      borrowerPhone: it.loans[0]?.borrowerPhone ?? null,
    })),
  })
}
