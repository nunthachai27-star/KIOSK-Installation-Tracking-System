import { prisma } from '@/lib/prisma'
import { IssueManager } from '@/components/IssueManager'
import { getJobFormOptions, getMasterValues } from '@/lib/master'

export default async function IssuesPage() {
  const [{ productTypes: masterProductTypes }, equipmentOptions] = await Promise.all([
    getJobFormOptions(),
    getMasterValues('EQUIPMENT_ITEM'),
  ])
  const [issues, serials, spareParts, users, stat30] = await Promise.all([
    prisma.issue.findMany({
      include: {
        job: { include: { hospital: true } },
        serial: { select: { serialNo: true } },
        reporter: { select: { name: true } },
        assignedTo: { select: { name: true } },
        parts: { orderBy: { createdAt: 'asc' } },
        // Timeline events are fetched lazily per-issue (see /api/issues/[id]/events) —
        // shipping all events up front bloated the payload (1600+ rows).
        _count: { select: { events: true } },
      },
      // แสดงปัญหาที่รับแจ้งล่าสุดขึ้นก่อน
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serialNumber.findMany({
      where: { serialType: 'BMS' },
      select: { id: true, serialNo: true, job: { select: { jobCode: true, productType: true, hospital: { select: { name: true } }, invoice: { select: { warrantyEndDate: true } } } } },
      orderBy: { serialNo: 'asc' },
    }),
    // Spare parts now live in the warehouse (คลังสินค้า → กลุ่มอะไหล่).
    prisma.stockProduct.findMany({
      where: { active: true, group: 'อะไหล่' }, orderBy: { name: 'asc' },
      select: { id: true, name: true, sellPrice: true, lots: { select: { items: { where: { status: 'IN_STOCK' }, select: { id: true } } } } },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.issue.groupBy({ by: ['status'], where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _count: true }),
  ])

  // 30-day claim activity for the helper sidebar.
  const cnt30 = (s: string) => stat30.find((g) => g.status === s)?._count ?? 0
  const inProgressSet = ['IN_PROGRESS', 'WAIT_CUSTOMER_RETURN', 'SENT_TO_SUPPLIER', 'SHIPPING_TO_CUSTOMER', 'WAIT_ONSITE', 'QUOTATION']
  const stats = {
    total: stat30.reduce((a, g) => a + g._count, 0),
    received: cnt30('RECEIVED'),
    inProgress: inProgressSet.reduce((a, s) => a + cnt30(s), 0),
    done: cnt30('DONE'),
  }

  const spareOpts = spareParts.map((s) => ({
    id: s.id, name: s.name,
    stockQty: s.lots.reduce((n, l) => n + l.items.length, 0),
    sellPrice: s.sellPrice ? s.sellPrice.toNumber() : null,
  }))

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
    issueType: i.issueType,
    serialNo: i.serial?.serialNo ?? i.machineSerial ?? null,
    hospital: i.job?.hospital.name ?? i.hospitalName ?? '—',
    jobCode: i.job?.jobCode ?? null,
    productType: i.job?.productType ?? i.productType ?? null,
    equipment: i.equipment ?? null,
    title: i.title,
    solution: i.solution,
    status: i.status,
    warrantyState: i.warrantyState,
    method: i.method,
    failedSerial: i.failedSerial,
    replacementSerial: i.replacementSerial,
    cost: i.cost ? i.cost.toNumber() : null,
    rating: i.rating,
    assignedToId: i.assignedToId,
    assignedToName: i.assignedTo?.name ?? null,
    parts: i.parts.map((p) => ({ id: p.id, name: p.name, qty: p.qty, unitPrice: p.unitPrice ? p.unitPrice.toNumber() : null, stockDeducted: p.stockDeducted })),
    reporter: i.reporter?.name ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    eventCount: i._count.events,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917] flex items-center gap-1.5">
          แจ้งปัญหา / เคลมสินค้า
          <span title="รับแจ้งเคลมตาม S/N BMS ของตู้ · ระบบตัดสินประกันอัตโนมัติจากวันเปิดบิล (+1 ปี) · บันทึก serial อุปกรณ์ที่เสีย/ที่ส่งเปลี่ยน วิธีดำเนินการ และค่าใช้จ่าย"
            className="text-[#B7C0CD] cursor-help text-[15px] font-normal">ⓘ</span>
        </h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">รับแจ้งเคลมตาม S/N BMS ของตู้ · ระบบตัดสินประกันอัตโนมัติจากวันเปิดบิล (+1 ปี) · บันทึก serial อุปกรณ์ที่เสีย/ที่ส่งเปลี่ยน วิธีดำเนินการ และค่าใช้จ่าย</p>
      </div>
      <IssueManager serials={serialOpts} initial={items} spareParts={spareOpts} users={users} stats={stats}
        productTypes={[...new Set(items.map((i) => i.productType).filter((p): p is string => !!p))].sort()}
        productTypeOptions={masterProductTypes} equipmentOptions={equipmentOptions} />
    </div>
  )
}
