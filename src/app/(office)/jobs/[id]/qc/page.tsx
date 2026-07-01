import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SerialQcForm } from '@/components/SerialQcForm'

export default async function JobQcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { serials: true, qc: true },
  })

  if (!job) notFound()

  return <SerialQcForm jobId={job.id} serials={job.serials} qc={job.qc} />
}
