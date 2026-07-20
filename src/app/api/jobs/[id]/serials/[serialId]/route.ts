import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; serialId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, serialId } = await params
  const serial = await prisma.serialNumber.findUnique({ where: { id: serialId }, select: { jobId: true, serialNo: true } })
  if (!serial || serial.jobId !== id) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.serialNumber.delete({ where: { id: serialId } })

  // If this serial came from stock (issued to this job), return it to the warehouse.
  // Match case-insensitively — component serials are stored upper-cased.
  if (serial.serialNo) {
    await prisma.stockItem.updateMany({
      where: { serialNo: { equals: serial.serialNo, mode: 'insensitive' }, jobId: id, status: 'ISSUED' },
      data: { status: 'IN_STOCK', jobId: null, hospitalId: null, issuedDate: null, serialBMS: null },
    })
  }
  return NextResponse.json({ ok: true })
}
