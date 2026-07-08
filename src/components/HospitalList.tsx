'use client'
import { useState } from 'react'
import Link from 'next/link'

type Item = { id: string; name: string; province: string; jobCount: number; itemCount: number }

export function HospitalList({ items }: { items: Item[] }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query ? items.filter((h) => `${h.name} ${h.province}`.toLowerCase().includes(query)) : items

  return (
    <div className="flex flex-col gap-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาโรงพยาบาล / จังหวัด…"
        className="w-full border border-[#D6DFEA] rounded-xl px-4 py-2.5 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
      />
      <div className="ds-card overflow-hidden">
        <div className="px-5 pt-4 pb-2 text-[13px] text-[#8492A6]">{filtered.length} โรงพยาบาล</div>
        {filtered.map((h) => (
          <Link key={h.id} href={`/hospitals/${h.id}`}
            className="ds-hover flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#EEF2F8] hover:bg-[#F8FAFD]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#1C1917] truncate">{h.name}</div>
              <div className="text-xs text-[#8492A6]">{h.province}</div>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <div className="text-sm font-bold text-[#1C1917] tnum">{h.jobCount}</div>
                <div className="text-[11px] text-[#8492A6]">งาน</div>
              </div>
              <div>
                <div className="text-sm font-bold text-[#1C1917] tnum">{h.itemCount}</div>
                <div className="text-[11px] text-[#8492A6]">สินค้า</div>
              </div>
              <span className="text-[#EA580C] font-semibold">›</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#EEF2F8]">ไม่พบโรงพยาบาล</div>}
      </div>
    </div>
  )
}
