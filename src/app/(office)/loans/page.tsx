import { prisma } from '@/lib/prisma'
import { loanLevel } from '@/lib/loan'
import { LoanManager } from '@/components/LoanManager'

export default async function LoansPage() {
  const [loans, available] = await Promise.all([
    prisma.loan.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: {
        item: { select: { serialBMS: true, serialNo: true, color: true, lot: { select: { lotCode: true, product: { select: { name: true, group: true } } } } } },
        recordedBy: { select: { name: true, nickname: true } },
      },
    }),
    // Only units still on the shelf can be lent.
    prisma.stockItem.findMany({
      where: { status: 'IN_STOCK' },
      orderBy: [{ serialBMS: 'asc' }, { serialNo: 'asc' }],
      select: { id: true, serialBMS: true, serialNo: true, color: true, lot: { select: { lotCode: true, product: { select: { name: true, group: true } } } } },
    }),
  ])

  const now = new Date()
  const rows = loans.map((l) => ({
    id: l.id,
    borrowerName: l.borrowerName,
    borrowerPhone: l.borrowerPhone,
    borrowerOrg: l.borrowerOrg,
    purpose: l.purpose,
    borrowedAt: l.borrowedAt.toISOString(),
    dueDate: l.dueDate.toISOString(),
    returnedAt: l.returnedAt ? l.returnedAt.toISOString() : null,
    returnNote: l.returnNote,
    level: loanLevel({ dueDate: l.dueDate, returnedAt: l.returnedAt }, now),
    serialBMS: l.item.serialBMS,
    serialNo: l.item.serialNo,
    color: l.item.color,
    lotCode: l.item.lot.lotCode,
    productName: l.item.lot.product.name,
    group: l.item.lot.product.group,
    recordedBy: l.recordedBy?.nickname ?? l.recordedBy?.name ?? null,
  }))

  const options = available.map((i) => ({
    id: i.id,
    serialBMS: i.serialBMS,
    serialNo: i.serialNo,
    color: i.color,
    lotCode: i.lot.lotCode,
    productName: i.lot.product.name,
    group: i.lot.product.group,
  }))

  const overdue = rows.filter((r) => r.level === 'OVERDUE').length
  const out = rows.filter((r) => r.returnedAt === null).length

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">🤝</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">ทะเบียนยืม-คืน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">ยืมอุปกรณ์จากคลังตาม Serial · ต้องระบุชื่อและเบอร์โทรผู้ยืมทุกครั้ง · แจ้งเตือนเมื่อเกินกำหนดคืน</p>
        </div>
      </div>
      <LoanManager rows={rows} options={options} outCount={out} overdueCount={overdue} availableCount={available.length} />
    </div>
  )
}
