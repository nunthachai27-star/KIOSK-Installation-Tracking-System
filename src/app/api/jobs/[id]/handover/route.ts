import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HandoverStatus } from '@prisma/client'
import { PROGRESS_RANK } from '@/lib/status'

const handoverInput = z.object({
  checklistStatus: z.enum(HandoverStatus).optional(),
  checklistReceivedDate: z.coerce.date().optional().nullable(),
  handoverStatus: z.enum(HandoverStatus).optional(),
  handoverDate: z.coerce.date().optional().nullable(),
  remark: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true, currentStatus: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const parsed = handoverInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = { ...parsed.data, recordedById: session.user.id }

  // เมื่อระบุ Checklist = "ได้รับแล้ว"/"ส่งมอบแล้ว" ต้องมีวันที่ได้รับ Checklist ด้วย
  if ((data.checklistStatus === 'RECEIVED' || data.checklistStatus === 'DELIVERED') && !data.checklistReceivedDate) {
    return NextResponse.json({ error: 'checklist_date_required', message: 'กรุณาระบุวันที่ได้รับ Checklist' }, { status: 400 })
  }

  const handover = await prisma.handoverRecord.upsert({
    where: { jobId: id },
    create: { jobId: id, ...data },
    update: data,
  })

  // "ได้รับ Checklist แล้ว" (หรือส่งมอบแล้ว) ดันงานไปขั้นงานบิล (WAIT_INVOICE) อัตโนมัติ
  // ไปข้างหน้าเท่านั้น — งานที่อยู่ขั้นบิล/ปิดแล้วจะไม่ถูกดึงกลับ
  const advance =
    data.checklistStatus === 'RECEIVED' || data.checklistStatus === 'DELIVERED' || data.handoverStatus === 'DELIVERED'
  if (advance && PROGRESS_RANK[job.currentStatus] < PROGRESS_RANK.WAIT_INVOICE) {
    await prisma.job.update({ where: { id }, data: { currentStatus: 'WAIT_INVOICE' } })
  }

  return NextResponse.json(handover)
}
