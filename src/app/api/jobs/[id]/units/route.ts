import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fieldCanAccessJob } from '@/lib/access'

export const dynamic = 'force-dynamic'

// ── GET: หน่วย BMS ของงาน (BMS Serial + MAC/Key ID) สำหรับเติมลงแบบฟอร์ม ─────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  if (session.user.role !== 'OFFICE' && !(await fieldCanAccessJob(id, session.user.id))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const [units, job] = await Promise.all([
    prisma.serialNumber.findMany({
      where: { jobId: id, serialType: 'BMS' },
      orderBy: { serialNo: 'asc' },
      select: { serialNo: true, unitQc: { select: { keyId: true } } },
    }),
    prisma.job.findUnique({
      where: { id },
      select: { province: true, hospital: { select: { name: true, address: true, province: true } } },
    }),
  ])

  return NextResponse.json(
    {
      units: units.map((u) => ({ serialNo: u.serialNo, mac: u.unitQc?.keyId ?? '' })),
      hospital: job?.hospital
        ? { name: job.hospital.name, address: job.hospital.address ?? '', province: job.hospital.province ?? job.province ?? '' }
        : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
