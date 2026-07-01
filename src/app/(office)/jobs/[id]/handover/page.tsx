import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { HandoverForm } from '@/components/HandoverForm'

export default async function JobHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { handover: true, invoice: true },
  })

  if (!job) notFound()

  return <HandoverForm job={job} handover={job.handover} invoice={job.invoice} />
}
