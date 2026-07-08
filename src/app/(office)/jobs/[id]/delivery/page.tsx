import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DeliveryForm } from '@/components/DeliveryForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { serializeJob, serializeDelivery } from '@/lib/serialize'

export default async function JobDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, users] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { delivery: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!job) notFound()

  return (
    <JobDetailShell jobId={job.id} active={4}>
      <DeliveryForm job={serializeJob(job)} delivery={serializeDelivery(job.delivery)} users={users} />
    </JobDetailShell>
  )
}
