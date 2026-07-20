'use client'
import { useEffect, useMemo, useState } from 'react'
import type { JobStatus } from '@prisma/client'
import { STATUS_META } from '@/lib/status'
import { PRODUCT_CATEGORIES, CATEGORY_META, type ProductCategory } from '@/lib/product-category'

type Item = {
  id: string; serialNo: string; productType: string; category: ProductCategory
  hospital: string; province: string; status: JobStatus; jobCode: string; year: number | null
}

const nf = new Intl.NumberFormat('th-TH')

export function ProductRegistry({ items }: { items: Item[] }) {
  const [cat, setCat] = useState<ProductCategory | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [limit, setLimit] = useState(60)

  // Category summary (always over the full asset base, not the current filter).
  const catCounts = useMemo(() => {
    const m = new Map<ProductCategory, number>()
    for (const it of items) m.set(it.category, (m.get(it.category) ?? 0) + 1)
    return m
  }, [items])
  const orderedCats = PRODUCT_CATEGORIES.filter((c) => (catCounts.get(c) ?? 0) > 0)

  // Raw product-type breakdown (the underlying 28 names) grouped under each category.
  const rawByCat = useMemo(() => {
    const m = new Map<ProductCategory, Map<string, number>>()
    for (const it of items) {
      const inner = m.get(it.category) ?? new Map<string, number>()
      inner.set(it.productType, (inner.get(it.productType) ?? 0) + 1)
      m.set(it.category, inner)
    }
    return m
  }, [items])

  const byCat = cat === 'ALL' ? items : items.filter((i) => i.category === cat)
  const sq = search.trim().toLowerCase()
  const shown = sq
    ? byCat.filter((i) => [i.serialNo, i.hospital, i.province, i.productType, i.jobCode]
        .some((v) => (v ?? '').toLowerCase().includes(sq)))
    : byCat
  useEffect(() => { setLimit(60) }, [cat, search])
  const visible = shown.slice(0, limit)

  const fmtYear = (y: number | null) => (y == null ? '—' : `พ.ศ. ${y + 543}`)

  return (
    <div className="flex flex-col gap-4">
      {/* summary cards by category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button onClick={() => setCat('ALL')}
          className={`ds-card p-4 text-left ${cat === 'ALL' ? 'ring-2 ring-[#EA580C]' : ''}`}>
          <div className="text-[12px] font-semibold text-[#8492A6]">📦 ทั้งหมด</div>
          <div className="text-[26px] font-bold tnum text-[#1C1917] mt-1 leading-none">{nf.format(items.length)}</div>
          <div className="text-[11px] text-[#A8A29E] mt-1">เครื่อง (S/N)</div>
        </button>
        {orderedCats.map((c) => {
          const m = CATEGORY_META[c]
          const active = cat === c
          return (
            <button key={c} onClick={() => setCat(active ? 'ALL' : c)}
              className={`ds-card p-4 text-left ${active ? 'ring-2' : ''}`}
              style={active ? { boxShadow: `0 0 0 2px ${m.color}` } : undefined}>
              <div className="text-[12px] font-semibold" style={{ color: m.color }}>{m.icon} {c}</div>
              <div className="text-[26px] font-bold tnum text-[#1C1917] mt-1 leading-none">{nf.format(catCounts.get(c) ?? 0)}</div>
              <div className="text-[11px] text-[#A8A29E] mt-1">เครื่อง</div>
            </button>
          )
        })}
      </div>

      {/* raw product-type breakdown */}
      <button onClick={() => setShowRaw((v) => !v)} className="self-start text-[12.5px] font-semibold text-[#EA580C] hover:underline">
        {showRaw ? '▾' : '▸'} ดูรายละเอียดตามชื่อรุ่นดิบ ({new Set(items.map((i) => i.productType)).size} รุ่น)
      </button>
      {showRaw && (
        <div className="ds-card p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {orderedCats.map((c) => {
            const inner = [...(rawByCat.get(c)?.entries() ?? [])].sort((a, b) => b[1] - a[1])
            const m = CATEGORY_META[c]
            return (
              <div key={c}>
                <div className="text-[13px] font-bold mb-1.5" style={{ color: m.color }}>{m.icon} {c} · {nf.format(catCounts.get(c) ?? 0)}</div>
                <ul className="flex flex-col gap-1">
                  {inner.map(([pt, n]) => (
                    <li key={pt} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <button onClick={() => { setSearch(pt); setCat('ALL') }} className="text-left text-[#3C4A5E] hover:text-[#EA580C] truncate">{pt}</button>
                      <span className="tnum font-semibold text-[#5A6B82] shrink-0">{nf.format(n)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* search */}
      <div className="relative">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา — S/N, โรงพยาบาล, จังหวัด, รุ่น…"
          className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]">🔍</span>
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
      </div>

      {/* result count */}
      <div className="text-[12.5px] text-[#8492A6]">
        {cat === 'ALL' ? 'ทุกหมวด' : `หมวด ${cat}`}{sq ? ` · ค้นหา “${search.trim()}”` : ''} — พบ {nf.format(shown.length)} เครื่อง
      </div>

      {/* table */}
      <div className="ds-card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[820px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-4 py-3 font-semibold">S/N เครื่อง</th>
              <th className="px-4 py-3 font-semibold">รุ่น</th>
              <th className="px-4 py-3 font-semibold">หมวด</th>
              <th className="px-4 py-3 font-semibold">โรงพยาบาลที่ติดตั้ง</th>
              <th className="px-4 py-3 font-semibold">จังหวัด</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 font-semibold text-right">ปีสัญญา</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8492A6]">ไม่พบรายการ</td></tr>
            )}
            {visible.map((it) => {
              const cm = CATEGORY_META[it.category]
              const sm = STATUS_META[it.status]
              return (
                <tr key={it.id} className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
                  <td className="px-4 py-2.5 font-bold tnum text-[#1C1917] whitespace-nowrap">{it.serialNo}</td>
                  <td className="px-4 py-2.5 text-[#3C4A5E] max-w-[220px] truncate" title={it.productType}>{it.productType}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap" style={{ background: cm.bg, color: cm.color }}>{cm.icon} {it.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#1C1917] max-w-[220px] truncate" title={it.hospital}>{it.hospital}</td>
                  <td className="px-4 py-2.5 text-[#5A6B82] whitespace-nowrap">{it.province}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tnum text-[#5A6B82] whitespace-nowrap">{fmtYear(it.year)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <button onClick={() => setLimit((n) => n + 60)}
          className="ds-card p-3.5 text-[13px] font-semibold text-[#EA580C] hover:bg-[#FFF7F2] text-center">
          แสดงเพิ่มอีก 60 รายการ · เหลืออีก {nf.format(shown.length - limit)} รายการ (แสดงอยู่ {nf.format(limit)} จาก {nf.format(shown.length)})
        </button>
      )}
    </div>
  )
}
