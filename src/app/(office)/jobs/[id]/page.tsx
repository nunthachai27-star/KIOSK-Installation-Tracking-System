import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { JobForm } from '@/components/JobForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { serializeJob } from '@/lib/serialize'
import { getJobFormOptions } from '@/lib/master'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, hospitals, users, options] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        hospital: true,
        // Serials feed the "รายงานขอใบส่งของ" report only (read-only).
        serials: { orderBy: { serialNo: 'asc' } },
      },
    }),
    prisma.hospital.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
    getJobFormOptions(),
  ])

  if (!job) notFound()

  // Group equipment serials under their BMS unit for the delivery-note report.
  const reportUnits = job.serials
    .filter((s) => s.serialType === 'BMS')
    .map((u) => ({
      serialNo: u.serialNo,
      items: job.serials
        .filter((c) => c.parentId === u.id)
        .map((c) => ({ label: c.label ?? 'อุปกรณ์', serialNo: c.serialNo })),
    }))

  return (
    <JobDetailShell jobId={id} active={1}>
      <JobForm job={serializeJob(job)} hospitals={hospitals} users={users} productTypes={options.productTypes} provinces={options.provinces}
        report={{ hospitalName: job.hospital.name, units: reportUnits }} />
    </JobDetailShell>
  )
}
