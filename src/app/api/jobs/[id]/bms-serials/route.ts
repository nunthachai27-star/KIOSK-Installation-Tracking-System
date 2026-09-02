import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ดูรายการเลข S/N BMS ที่มีอยู่แล้วของ "รหัส BMS" ตามประเภทสินค้าของงานนี้ (ล่าสุดอยู่บน)
// ถ้าประเภทนี้ไม่มีรหัส BMS → ใช้เลขของงานที่เป็นประเภทสินค้าเดียวกันแทน
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { productType: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const cfg = await prisma.productBmsCode.findUnique({ where: { productType: job.productType }, select: { code: true } })
  const where = cfg
    ? { serialType: 'BMS' as const, serialNo: { startsWith: `BMS-${cfg.code}` } }
    : { serialType: 'BMS' as const, job: { productType: job.productType } }

  const rows = await prisma.serialNumber.findMany({
    where,
    orderBy: { serialNo: 'desc' }, // เลขล่าสุด/สูงสุดอยู่บน (serial ซีเควนซ์ตามปี+ลำดับ)
    take: 800,
    select: {
      serialNo: true, jobId: true,
      job: { select: { jobCode: true, productType: true, hospital: { select: { name: true } } } },
    },
  })

  return NextResponse.json({
    code: cfg?.code ?? null,
    productType: job.productType,
    total: rows.length,
    items: rows.map((r) => ({
      serialNo: r.serialNo,
      jobCode: r.job?.jobCode ?? null,
      productType: r.job?.productType ?? null,
      hospitalName: r.job?.hospital?.name ?? null,
      isThisJob: r.jobId === id,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
