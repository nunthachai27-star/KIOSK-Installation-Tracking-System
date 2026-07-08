import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isCategory, categoryLabel } from '@/lib/master'
import { MasterOptionManager } from '@/components/MasterOptionManager'

export default async function SettingsCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!isCategory(category)) notFound()

  const items = await prisma.masterOption.findMany({
    where: { category },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    select: { id: true, value: true, active: true },
  })

  return (
    <div className="p-6 max-w-[720px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[#5A6B82] hover:text-[#EA580C]">‹ ตั้งค่า</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917]">{categoryLabel(category)}</h1>
      </div>
      <MasterOptionManager
        category={category}
        initial={items}
        configHrefBase={category === 'PRODUCT_TYPE' ? '/settings/product-spec' : undefined}
      />
    </div>
  )
}
