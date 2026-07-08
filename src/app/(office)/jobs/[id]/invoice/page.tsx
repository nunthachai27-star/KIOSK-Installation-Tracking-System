import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InvoiceForm } from '@/components/InvoiceForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { serializeJob, serializeInvoice } from '@/lib/serialize'

export default async function JobInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { handover: true, invoice: true },
  })

  if (!job) notFound()

  return (
    <JobDetailShell jobId={job.id} active={6}>
      <InvoiceForm
        job={serializeJob(job)}
        invoice={serializeInvoice(job.invoice)}
        handoverStatus={job.handover?.handoverStatus ?? 'PENDING'}
      />
    </JobDetailShell>
  )
}
