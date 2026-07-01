import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SerialQcForm } from '@/components/SerialQcForm'
import { JobStepNav } from '@/components/JobStepNav'

export default async function JobQcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { serials: true, qc: true },
  })

  if (!job) notFound()

  return (
    <>
      <JobStepNav jobId={job.id} active={2} />
      <SerialQcForm jobId={job.id} serials={job.serials} qc={job.qc} />
    </>
  )
}
