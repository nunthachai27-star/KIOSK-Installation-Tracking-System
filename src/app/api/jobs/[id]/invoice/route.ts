import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'
import { warrantyEndFrom } from '@/lib/warranty'

const invoiceInput = z.object({
  status: z.enum(InvoiceStatus).optional(),
  invoiceDate: z.coerce.date().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
  invoiceAmount: z.coerce.number().optional().nullable(),
  remark: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const parsed = invoiceInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  // Warranty end date is derived from the invoice open date (+1 year); kept in sync here.
  // undefined = field not sent (leave as-is), null = cleared, date = recompute.
  const warrantyEndDate =
    data.invoiceDate === undefined ? undefined
    : data.invoiceDate === null ? null
    : warrantyEndFrom(data.invoiceDate)
  const record = { ...data, warrantyEndDate, recordedById: session.user.id }

  const invoice = await prisma.invoiceRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, ...record },
    update: record,
  })

  return NextResponse.json(invoice)
}
