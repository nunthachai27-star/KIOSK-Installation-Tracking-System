import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { stockLevel } from '@/lib/stock'
import { StockItemList } from '@/components/StockItemList'

export default async function StockProductPage({ params, searchParams }: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ lot?: string; q?: string }>
}) {
  const { productId } = await params
  const { lot, q } = await searchParams

  const product = await prisma.stockProduct.findUnique({
    where: { id: productId },
    include: {
      lots: {
        orderBy: { lotCode: 'asc' },
        include: {
          items: {
            orderBy: [{ seq: 'asc' }, { serialBMS: 'asc' }],
            include: { hospital: { select: { name: true } }, job: { select: { id: true, jobCode: true } } },
          },
        },
      },
    },
  })
  if (!product) notFound()

  const items = product.lots.flatMap((l) => l.items.map((it) => ({
    id: it.id,
    lotCode: l.lotCode,
    seq: it.seq,
    serialBMS: it.serialBMS,
    serialNo: it.serialNo,
    color: it.color,
    status: it.status,
    receivedDate: it.receivedDate ? it.receivedDate.toISOString() : null,
    issuedDate: it.issuedDate ? it.issuedDate.toISOString() : null,
    deliveredDate: it.deliveredDate ? it.deliveredDate.toISOString() : null,
    hospitalName: it.hospital?.name ?? it.hospitalName ?? null,
    jobId: it.job?.id ?? null,
    jobCode: it.job?.jobCode ?? null,
  })))

  // Serial products count items; quantity-only products (spare parts) use receivedQty.
  const received = product.serialized ? items.length : product.lots.reduce((s, l) => s + l.receivedQty, 0)
  const issued = product.serialized ? items.filter((i) => i.status === 'ISSUED').length : 0
  const remaining = received - issued
  const unit = product.serialized ? 'เครื่อง' : product.unit
  const lotCodes = product.lots.map((l) => l.lotCode)

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stock" className="text-[#5A6B82] hover:text-[#EA580C]">‹ คลังสินค้า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <span className="text-[#8492A6]">{product.group}</span>
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">{product.name}</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">{product.group} · {product.lots.length} Lot · {received} {unit}{product.serialized ? '' : ' · นับจำนวน (ไม่มี Serial)'}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'รับเข้ารวม', value: received, color: '#1C1917' },
          { label: 'จ่ายออกแล้ว', value: issued, color: '#6D28D9' },
          { label: 'คงเหลือ', value: remaining, color: stockLevel(remaining, product.lowStockQty) === 'OUT' ? '#C13540' : stockLevel(remaining, product.lowStockQty) === 'LOW' ? '#B45309' : '#157F4C' },
        ].map((c) => (
          <div key={c.label} className="ds-card px-4 py-3">
            <div className="text-[12px] text-[#8492A6]">{c.label}</div>
            <div className="text-[24px] font-bold tnum mt-1 leading-none" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {product.serialized ? (
        <StockItemList items={items} lotCodes={lotCodes} initialLot={lot ?? ''} initialQ={q ?? ''} />
      ) : (
        <div className="ds-card p-6 text-center text-[13px] text-[#8492A6]">
          สินค้านับจำนวน (อะไหล่) — คงเหลือ <span className="font-bold text-[#157F4C]">{remaining}</span> {unit} · ไม่มี Serial รายชิ้น
          {product.sellPrice != null && <div className="mt-1">ราคาขาย {new Intl.NumberFormat('th-TH').format(product.sellPrice.toNumber())} บาท/{unit}</div>}
        </div>
      )}
    </div>
  )
}
