import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CHECKLIST } from '@/lib/product-spec'
import { ProductChecklistManager } from '@/components/ProductChecklistManager'
import { ProductComponentManager } from '@/components/ProductComponentManager'
import { ProductBmsCodeManager } from '@/components/ProductBmsCodeManager'

export default async function ProductSpecPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: raw } = await params
  const productType = decodeURIComponent(raw)

  const [checklist, components, bms] = await Promise.all([
    prisma.productChecklistItem.findMany({
      where: { productType },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: { id: true, label: true, active: true },
    }),
    prisma.productComponent.findMany({
      where: { productType },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, quantity: true, needsSerial: true },
    }),
    prisma.productBmsCode.findUnique({ where: { productType }, select: { code: true } }),
  ])

  return (
    <div className="p-6 max-w-[720px] mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[#EA580C]">ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <Link href="/settings/PRODUCT_TYPE" className="text-[#5A6B82] hover:text-[#EA580C]">ประเภทสินค้า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">{productType}</h1>
      </div>

      <div>
        <div className="text-[15px] font-bold text-[#1C1917] mb-1">รหัส S/N BMS (ออกเลขอัตโนมัติ)</div>
        <p className="text-[12.5px] text-[#8492A6] mb-2.5">รหัสอุปกรณ์สำหรับออกเลข BMS อัตโนมัติในหน้า QC · รูปแบบ BMS-{'{รหัส}'}{'{ปีพ.ศ.}'}-{'{ลำดับ}'}</p>
        <ProductBmsCodeManager productType={productType} initialCode={bms?.code ?? ''} />
      </div>

      <div>
        <div className="text-[15px] font-bold text-[#1C1917] mb-1">รายการอุปกรณ์ในชุด (BOM)</div>
        <p className="text-[12.5px] text-[#8492A6] mb-2.5">อุปกรณ์ที่ประกอบเป็นสินค้านี้ · ปุ่ม “เก็บ Serial/ไม่เก็บ” = ให้หน้า QC มีช่องกรอก Serial ของอุปกรณ์นั้นหรือไม่</p>
        <ProductComponentManager productType={productType} initial={components} />
      </div>

      <div>
        <div className="text-[15px] font-bold text-[#1C1917] mb-1">รายการตรวจสอบ (QC Checklist)</div>
        <p className="text-[12.5px] text-[#8492A6] mb-2.5">ถ้าไม่กำหนด จะใช้ค่าเริ่มต้น: {DEFAULT_CHECKLIST.join(' · ')}</p>
        <ProductChecklistManager productType={productType} initial={checklist} />
      </div>
    </div>
  )
}
