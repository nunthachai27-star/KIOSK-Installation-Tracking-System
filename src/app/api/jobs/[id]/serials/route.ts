import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSerial, findDuplicateSerial } from '@/lib/serial'
import type { SerialType } from '@prisma/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await req.json()) as { serialType?: SerialType | null; label?: string | null; serialNo?: string; parentId?: string | null; stockItemId?: string | null }
  const { serialType, label, parentId, stockItemId } = body

  // Ensure the target job exists (+ hospital for stock issue).
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true, hospitalId: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // A component serial may attach to a BMS unit (parentId) of the same job.
  // Capture the parent unit's BMS serial so an issued stock item records its S/N BMS.
  let parentBms: string | null = null
  if (parentId) {
    const parent = await prisma.serialNumber.findFirst({ where: { id: parentId, jobId: id }, select: { id: true, serialNo: true } })
    if (!parent) return NextResponse.json({ error: 'bad parent' }, { status: 400 })
    parentBms = parent.serialNo
  }

  // Component serials must be picked from warehouse stock (จ่ายออกจากคลัง).
  // When a stockItemId is supplied, use that unit's serial and mark it ISSUED.
  if (typeof stockItemId === 'string' && stockItemId) {
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })
    const stock = await prisma.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true, serialNo: true, status: true } })
    if (!stock || !stock.serialNo) return NextResponse.json({ error: 'stock item not found' }, { status: 404 })
    if (stock.status !== 'IN_STOCK') return NextResponse.json({ error: 'already issued' }, { status: 409 })
    if (await findDuplicateSerial(stock.serialNo, id)) {
      return NextResponse.json({ error: 'duplicate serial' }, { status: 409 })
    }
    const [created] = await prisma.$transaction([
      prisma.serialNumber.create({
        data: { jobId: id, label, parentId: parentId ?? null, serialNo: normalizeSerial(stock.serialNo) },
      }),
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: { status: 'ISSUED', jobId: id, hospitalId: job.hospitalId, issuedDate: new Date(), serialBMS: parentBms },
      }),
    ])
    return NextResponse.json(created, { status: 201 })
  }

  // Non-stock path (BMS asset tag / legacy free entry).
  const serialNo = body.serialNo
  if (!serialNo || (!serialType && !label)) {
    return NextResponse.json({ error: 'serialNo and (serialType or label) are required' }, { status: 400 })
  }
  if (await findDuplicateSerial(serialNo, id)) {
    return NextResponse.json({ error: 'duplicate serial' }, { status: 409 })
  }
  const created = await prisma.serialNumber.create({
    data: { jobId: id, serialType: serialType ?? null, label: label ?? null, parentId: parentId ?? null, serialNo: normalizeSerial(serialNo) },
  })
  return NextResponse.json(created, { status: 201 })
}
