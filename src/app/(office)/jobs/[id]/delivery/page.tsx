import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DeliveryForm } from '@/components/DeliveryForm'
import { JobStepNav } from '@/components/JobStepNav'
import { serializeJob, serializeDelivery } from '@/lib/serialize'

export default async function JobDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { delivery: true, installation: true },
  })

  if (!job) notFound()

  return (
    <>
      <JobStepNav jobId={job.id} active={3} />
      <DeliveryForm job={serializeJob(job)} delivery={serializeDelivery(job.delivery)} installation={job.installation} />
    </>
  )
}
