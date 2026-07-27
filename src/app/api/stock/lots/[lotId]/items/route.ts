import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'

// Add blank unit rows into an EXISTING lot (e.g. the lot was first created with
// fewer units than actually received). New units are IN_STOCK with no serial yet
// — serials are filled inline afterwards. Keeps the lot's receivedQty in step.
export async function POST(req: Request, { params }: { params: Promise<{ lotId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { lotId } = await params
  const lot = await prisma.stockLot.findUnique({
    where: { id: lotId },
    select: { id: true, lotCode: true, receivedDate: true, receivedQty: true },
  })
  if (!lot) return NextResponse.json({ error: 'lot not found' }, { status: 404 })

  const b = await req.json().catch(() => ({}))
  const count = Math.min(200, Math.max(1, Math.trunc(Number(b?.count) || 1)))

  const last = await prisma.stockItem.findFirst({ where: { lotId }, orderBy: { seq: 'desc' }, select: { seq: true } })
  const startSeq = (last?.seq ?? 0) + 1
  const recv = lot.receivedDate

  const created = await prisma.$transaction(async (tx) => {
    const rows = []
    for (let i = 0; i < count; i++) {
      rows.push(await tx.stockItem.create({
        data: { lotId, seq: startSeq + i, status: 'IN_STOCK', receivedDate: recv },
        select: { id: true, seq: true, serialBMS: true, serialNo: true, color: true, status: true, receivedDate: true },
      }))
    }
    await tx.stockLot.update({ where: { id: lotId }, data: { receivedQty: { increment: count } } })
    return rows
  })

  await logAction(session.user, 'CREATE', 'คลังสินค้า', `เพิ่ม ${count} เครื่องใน Lot ${lot.lotCode}`)
  return NextResponse.json(
    created.map((it) => ({
      id: it.id, lotCode: lot.lotCode, seq: it.seq, serialBMS: it.serialBMS, serialNo: it.serialNo, color: it.color,
      status: it.status, receivedDate: it.receivedDate ? it.receivedDate.toISOString() : null,
      issuedDate: null, deliveredDate: null, hospitalName: null, jobId: null, jobCode: null,
      borrowerName: null, borrowerPhone: null, dueDate: null, claimIssueId: null, claimMachineSerial: null,
    })),
    { status: 201 },
  )
}
