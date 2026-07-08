'use client'
import { useRouter } from 'next/navigation'

/** Registry filters: product type + contract year. Navigates with query params
 * so the server component re-queries. `all` (show-closed) and `step` (workflow
 * step group) are preserved. */
export function JobFilters({
  productTypes, years, type, year, showAll, step,
}: {
  productTypes: string[]
  years: number[]
  type: string
  year: string
  showAll: boolean
  step: string
}) {
  const router = useRouter()

  function go(next: { type?: string; year?: string }) {
    const t = next.type !== undefined ? next.type : type
    const y = next.year !== undefined ? next.year : year
    const p = new URLSearchParams()
    if (t) p.set('type', t)
    if (y) p.set('year', y)
    if (showAll) p.set('all', '1')
    if (step) p.set('step', step)
    const qs = p.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  function clear() {
    const p = new URLSearchParams()
    if (showAll) p.set('all', '1')
    if (step) p.set('step', step)
    const qs = p.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  const field =
    'border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] bg-white outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select value={year} onChange={(e) => go({ year: e.target.value })} className={field} aria-label="กรองตามปีเริ่มสัญญา">
        <option value="">ทุกปี</option>
        {years.map((y) => (
          <option key={y} value={y}>ปี {y}</option>
        ))}
      </select>
      <select value={type} onChange={(e) => go({ type: e.target.value })} className={field} aria-label="กรองตามประเภทสินค้า">
        <option value="">ทุกประเภท</option>
        {productTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {(type || year) && (
        <button onClick={clear} className="text-[12.5px] font-medium text-[#5A6B82] hover:text-[#C13540]">
          ล้างตัวกรอง
        </button>
      )}
    </div>
  )
}
