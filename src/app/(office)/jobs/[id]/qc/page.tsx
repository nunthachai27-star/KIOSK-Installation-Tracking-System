import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { QcForm } from '@/components/QcForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { getProductSpec } from '@/lib/product-spec'

export default async function JobQcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, users, session] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, name: true, code: true } },
        // Load every serial (BMS units + their component children) so QC can list
        // the equipment recorded per unit.
        serials: { include: { unitQc: true }, orderBy: { serialNo: 'asc' } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    auth(),
  ])
  if (!job) notFound()

  const currentUser = { id: session?.user?.id ?? '', name: session?.user?.name ?? '' }

  const spec = await getProductSpec(job.productType)
  const units = job.serials
    .filter((s) => s.serialType === 'BMS')
    .map((s) => ({
      id: s.id,
      serialNo: s.serialNo,
      qc: s.unitQc ? { status: s.unitQc.status, checklist: s.unitQc.checklist, staffId: s.unitQc.staffId, keyId: s.unitQc.keyId, licenseKey: s.unitQc.licenseKey, memoLicense: s.unitQc.memoLicense } : null,
      // Equipment recorded for this unit in the Serial step (component children).
      items: job.serials
        .filter((c) => c.parentId === s.id)
        .map((c) => ({ label: c.label ?? 'อุปกรณ์', serialNo: c.serialNo })),
    }))

  return (
    <JobDetailShell jobId={job.id} active={3}>
      <QcForm jobId={job.id} units={units} checklistItems={spec.checklist} users={users} currentUser={currentUser}
        hospital={{ id: job.hospital.id, name: job.hospital.name, code: job.hospital.code }} jobColor={job.color} />
    </JobDetailShell>
  )
}
