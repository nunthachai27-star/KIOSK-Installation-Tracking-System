import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { HandoverForm } from '@/components/HandoverForm'
import { JobStepNav } from '@/components/JobStepNav'
import { serializeJob, serializeInvoice } from '@/lib/serialize'

export default async function JobHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { handover: true, invoice: true },
  })

  if (!job) notFound()

  return (
    <>
      <JobStepNav jobId={job.id} active={4} />
      <HandoverForm job={serializeJob(job)} handover={job.handover} invoice={serializeInvoice(job.invoice)} />
    </>
  )
}
