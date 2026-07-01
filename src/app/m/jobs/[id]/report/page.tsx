import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fieldCanAccessJob } from '@/lib/access'
import { QuickReportForm } from '@/components/QuickReportForm'

export default async function MobileJobReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, include: { hospital: true } })

  if (!job) notFound()

  // FIELD users may only report on jobs assigned to them; OFFICE may view any.
  if (session.user.role !== 'OFFICE' && !(await fieldCanAccessJob(id, session.user.id))) {
    notFound()
  }

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="text-sm font-bold text-[#2E3252]">{job.hospital.name}</div>
        <div className="text-xs text-[#8E8FB0]">{job.jobCode} · {job.province}</div>
      </div>
      <QuickReportForm jobId={job.id} />
    </div>
  )
}
