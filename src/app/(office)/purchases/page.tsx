import { prisma } from '@/lib/prisma'
import { PurchaseManager } from '@/components/PurchaseManager'

export default async function PurchasesPage() {
  const rows = await prisma.purchase.findMany({
    orderBy: { createdAt: 'desc' },
    include: { requestedBy: { select: { name: true } } },
  })

  const items = rows.map((p) => ({
    id: p.id,
    itemName: p.itemName,
    category: p.category,
    quantity: p.quantity,
    unit: p.unit,
    vendor: p.vendor,
    price: p.price ? p.price.toNumber() : null,
    status: p.status,
    note: p.note,
    neededDate: p.neededDate ? p.neededDate.toISOString() : null,
    orderedDate: p.orderedDate ? p.orderedDate.toISOString() : null,
    receivedDate: p.receivedDate ? p.receivedDate.toISOString() : null,
    requestedByName: p.requestedBy?.name ?? null,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">🛒</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">งานจัดซื้อ</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">บันทึกอุปกรณ์ที่จัดซื้อ · ติดตามสถานะตั้งแต่ขอซื้อจนรับของ</p>
        </div>
      </div>
      <PurchaseManager initial={items} />
    </div>
  )
}
