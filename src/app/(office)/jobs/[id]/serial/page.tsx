import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { SerialForm } from '@/components/SerialForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { getProductSpec } from '@/lib/product-spec'

export default async function JobSerialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, users, session] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { serials: true, serialRecord: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    auth(),
  ])
  if (!job) notFound()

  const spec = await getProductSpec(job.productType)
  const currentUser = { id: session?.user?.id ?? '', name: session?.user?.name ?? '' }

  return (
    <JobDetailShell jobId={job.id} active={2}>
      <SerialForm
        jobId={job.id}
        serials={job.serials}
        components={spec.components}
        bmsCode={spec.bmsCode}
        quantity={job.quantity}
        users={users}
        record={job.serialRecord ? {
          staffId: job.serialRecord.staffId,
          status: job.serialRecord.status,
          qcPlannedDate: job.serialRecord.qcPlannedDate ? job.serialRecord.qcPlannedDate.toISOString() : null,
        } : null}
        currentUser={currentUser}
      />
    </JobDetailShell>
  )
}
