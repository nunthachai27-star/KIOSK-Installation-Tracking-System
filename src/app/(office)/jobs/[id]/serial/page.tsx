import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { SerialForm } from '@/components/SerialForm'
import { JobDetailShell } from '@/components/JobDetailShell'
import { getProductSpec } from '@/lib/product-spec'

export default async function JobSerialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [job, users, session, stockItems] = await Promise.all([
    prisma.job.findUnique({ where: { id }, include: { serials: true, serialRecord: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    auth(),
    // Available warehouse stock (IN_STOCK with a factory serial) — component serials
    // must be picked from here so choosing one issues it out of the warehouse.
    prisma.stockItem.findMany({
      where: { status: 'IN_STOCK', serialNo: { not: null } },
      select: { id: true, serialNo: true, color: true, lot: { select: { lotCode: true, product: { select: { group: true, name: true } } } } },
      orderBy: { serialNo: 'asc' },
    }),
  ])
  if (!job) notFound()

  const spec = await getProductSpec(job.productType)
  const currentUser = { id: session?.user?.id ?? '', name: session?.user?.name ?? '' }
  const stockOptions = stockItems.map((s) => ({
    id: s.id, serialNo: s.serialNo as string, color: s.color,
    group: s.lot.product.group, product: s.lot.product.name, lotCode: s.lot.lotCode,
  }))

  // Report whether each already-assigned component serial matches warehouse stock:
  // DEDUCTED = issued to this job · ISSUED_OTHER = issued elsewhere · IN_STOCK = still in stock · (missing = not in stock).
  const compSerials = [...new Set(job.serials.filter((s) => s.parentId).map((s) => s.serialNo.toUpperCase()))]
  const stockMatches = compSerials.length
    ? await prisma.stockItem.findMany({
        where: { OR: compSerials.map((sn) => ({ serialNo: { equals: sn, mode: 'insensitive' as const } })) },
        select: { serialNo: true, status: true, jobId: true },
      })
    : []
  // A factory serial can exist in several products at once (they only run unique per
  // model), so more than one row can match. Rank rather than let the last row win:
  // anything still IN_STOCK means there is stock left to deduct, and a unit already
  // issued to *this* job beats one issued elsewhere.
  const RANK = { IN_STOCK: 3, DEDUCTED: 2, ISSUED_OTHER: 1 } as const
  const stockStatus: Record<string, 'DEDUCTED' | 'ISSUED_OTHER' | 'IN_STOCK'> = {}
  for (const m of stockMatches) {
    if (!m.serialNo) continue
    const key = m.serialNo.toUpperCase()
    const next = m.status === 'ISSUED' ? (m.jobId === job.id ? 'DEDUCTED' : 'ISSUED_OTHER') : 'IN_STOCK'
    const cur = stockStatus[key]
    if (!cur || RANK[next] > RANK[cur]) stockStatus[key] = next
  }

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
        stockOptions={stockOptions}
        stockStatus={stockStatus}
      />
    </JobDetailShell>
  )
}
