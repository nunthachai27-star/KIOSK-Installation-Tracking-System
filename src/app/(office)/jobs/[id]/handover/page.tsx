import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InstallHandoverForm } from '@/components/InstallHandoverForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { serializeJob } from '@/lib/serialize'

export default async function JobHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      installation: true,
      handover: true,
      installerOwner: { select: { name: true } },
      delivery: { select: { status: true, shippedDate: true, arrivedDate: true } },
      hospital: { select: { name: true, province: true } },
    },
  })

  if (!job) notFound()

  return (
    <JobDetailShell jobId={job.id} active={5}>
      <InstallHandoverForm
        job={serializeJob(job)}
        installation={job.installation}
        handover={job.handover}
        installerName={job.installerOwner?.name ?? null}
        delivery={job.delivery ? {
          status: job.delivery.status,
          shippedDate: job.delivery.shippedDate ? job.delivery.shippedDate.toISOString() : null,
          arrivedDate: job.delivery.arrivedDate ? job.delivery.arrivedDate.toISOString() : null,
        } : null}
        hospital={{ name: job.hospital.name, province: job.hospital.province }}
      />
    </JobDetailShell>
  )
}
