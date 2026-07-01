import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuickReportForm } from '@/components/QuickReportForm'

export default async function MobileJobReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, include: { hospital: true } })

  if (!job) notFound()

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="text-sm font-bold text-[#12233B]">{job.hospital.name}</div>
        <div className="text-xs text-[#8492A6]">{job.jobCode} · {job.province}</div>
      </div>
      <QuickReportForm jobId={job.id} />
    </div>
  )
}
