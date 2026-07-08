import { prisma } from '@/lib/prisma'
import { IssueManager } from '@/components/IssueManager'

export default async function IssuesPage() {
  const [issues, serials] = await Promise.all([
    prisma.issue.findMany({
      include: {
        job: { include: { hospital: true } },
        serial: { select: { serialNo: true } },
        reporter: { select: { name: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.serialNumber.findMany({
      where: { serialType: 'BMS' },
      include: { job: { include: { hospital: true, invoice: { select: { warrantyEndDate: true } } } } },
      orderBy: { serialNo: 'asc' },
    }),
  ])

  const serialOpts = serials.map((s) => ({
    id: s.id,
    serialNo: s.serialNo,
    hospital: s.job.hospital.name,
    jobCode: s.job.jobCode,
    productType: s.job.productType,
    warrantyEndDate: s.job.invoice?.warrantyEndDate ? s.job.invoice.warrantyEndDate.toISOString() : null,
  }))

  const items = issues.map((i) => ({
    id: i.id,
    serialNo: i.serial?.serialNo ?? null,
    hospital: i.job.hospital.name,
    jobCode: i.job.jobCode,
    productType: i.job.productType,
    title: i.title,
    solution: i.solution,
    status: i.status,
    warrantyState: i.warrantyState,
    method: i.method,
    failedSerial: i.failedSerial,
    replacementSerial: i.replacementSerial,
    cost: i.cost ? i.cost.toNumber() : null,
    reporter: i.reporter?.name ?? null,
    updatedAt: i.updatedAt.toISOString(),
    events: i.events.map((e) => ({
      id: e.id,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
    })),
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">แจ้งปัญหา / เคลมสินค้า</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">รับแจ้งเคลมตาม S/N BMS ของตู้ · ระบบตัดสินประกันอัตโนมัติจากวันเปิดบิล (+1 ปี) · บันทึก serial อุปกรณ์ที่เสีย/ที่ส่งเปลี่ยน วิธีดำเนินการ และค่าใช้จ่าย</p>
      </div>
      <IssueManager serials={serialOpts} initial={items} />
    </div>
  )
}
