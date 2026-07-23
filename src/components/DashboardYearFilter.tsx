'use client'
import { useRouter } from 'next/navigation'

// Year selector for the dashboard. Values are CE years; labels show พ.ศ.
// Navigates to ?year=<CE> so the server re-aggregates for that year.
export function DashboardYearFilter({ years, year }: { years: number[]; year: number }) {
  const router = useRouter()
  const options = years.length ? years : [year]
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[13px] font-semibold text-[#5A6B82]">ปี</span>
      <select
        value={year}
        onChange={(e) => router.push(`/dashboard?year=${e.target.value}`)}
        className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm font-semibold bg-white outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15"
      >
        {options.map((y) => (
          <option key={y} value={y}>{y + 543}</option>
        ))}
      </select>
    </div>
  )
}
