import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { JobForm } from '@/components/JobForm'
import { JobStepNav } from '@/components/JobStepNav'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, hospitals, users] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { hospital: true } }),
    prisma.hospital.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
  ])

  if (!job) notFound()

  return (
    <>
      <JobStepNav jobId={id} active={1} />
      <JobForm job={job} hospitals={hospitals} users={users} />
    </>
  )
}
