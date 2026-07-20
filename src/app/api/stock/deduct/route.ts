import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Deduct an already-assigned component serial from warehouse stock (จ่ายออก) in one click.
// Used when a component was recorded before the stock link existed but its serial matches
// an IN_STOCK unit — this issues that unit to the component's job/BMS.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { serialId } = await req.json()
  if (typeof serialId !== 'string' || !serialId) return NextResponse.json({ error: 'serialId required' }, { status: 400 })

  const serial = await prisma.serialNumber.findUnique({
    where: { id: serialId },
    select: { serialNo: true, jobId: true, parent: { select: { serialNo: true } }, job: { select: { hospitalId: true } } },
  })
  if (!serial || !serial.jobId) return NextResponse.json({ error: 'serial not found' }, { status: 404 })

  const stock = await prisma.stockItem.findFirst({
    where: { status: 'IN_STOCK', serialNo: { equals: serial.serialNo, mode: 'insensitive' } },
    select: { id: true },
  })
  if (!stock) return NextResponse.json({ error: 'not_in_stock' }, { status: 404 })

  await prisma.stockItem.update({
    where: { id: stock.id },
    data: {
      status: 'ISSUED', jobId: serial.jobId, hospitalId: serial.job?.hospitalId ?? null,
      serialBMS: serial.parent?.serialNo ?? null, issuedDate: new Date(),
    },
  })
  return NextResponse.json({ ok: true, stockItemId: stock.id })
}
