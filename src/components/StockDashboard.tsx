'use client'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { GroupSummary, ProductSummary, StockStatusLevel } from '@/lib/stock'
import { STOCK_LEVEL_META } from '@/lib/stock'

const nf = new Intl.NumberFormat('th-TH')
type Kpi = { received: number; issued: number; remaining: number; low: number; out: number; products: number }

export function StockDashboard({ kpi, groups }: { kpi: Kpi; groups: GroupSummary[] }) {
  const [q, setQ] = useState('')
  const [level, setLevel] = useState<'' | StockStatusLevel>('')
  const [group, setGroup] = useState('')

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(() => groups
    .filter((g) => !group || g.group === group)
    .map((g) => ({
      ...g,
      products: g.products.filter((p) =>
        (!ql || p.name.toLowerCase().includes(ql)) && (!level || p.level === level)),
    }))
    .filter((g) => g.products.length > 0), [groups, group, ql, level])

  const cards = [
    { icon: '📥', bg: '#E4EEFF', label: 'รับเข้ารวม', value: kpi.received, sub: 'ชิ้น', color: '#1C1917' },
    { icon: '📤', bg: '#F3EEFF', label: 'จ่ายออกแล้ว', value: kpi.issued, sub: 'ชิ้น', color: '#1C1917' },
    { icon: '📦', bg: '#E2F3EA', label: 'คงเหลือในคลัง', value: kpi.remaining, sub: 'ชิ้น', color: '#157F4C' },
    { icon: '⚠️', bg: '#FBE4E4', label: 'ใกล้หมด / หมด', value: kpi.low + kpi.out, sub: `ใกล้หมด ${nf.format(kpi.low)} · หมด ${nf.format(kpi.out)}`, color: kpi.low + kpi.out > 0 ? '#C13540' : '#1C1917' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="ds-card ds-hover px-5 py-4 flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#8492A6] truncate">{c.label}</div>
              <div className="text-[26px] leading-none font-bold tnum mt-1" style={{ color: c.color }}>{nf.format(c.value)}</div>
              <div className="text-[11px] text-[#A8A29E] mt-0.5">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารุ่น/อุปกรณ์…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#EA580C]">
          <option value="">ทุกกลุ่มสินค้า</option>
          {groups.map((g) => <option key={g.group} value={g.group}>{g.group}</option>)}
        </select>
        {(['', 'OK', 'LOW', 'OUT'] as const).map((lv) => (
          <button key={lv || 'all'} onClick={() => setLevel(lv)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${level === lv ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {lv === '' ? 'ทั้งหมด' : STOCK_LEVEL_META[lv].label}
          </button>
        ))}
      </div>

      {/* grouped list */}
      {filtered.length === 0 ? (
        <div className="ds-card p-8 text-center text-[#8492A6] text-sm">ไม่พบรายการ</div>
      ) : filtered.map((g) => (
        <div key={g.group} className="ds-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap px-4 md:px-5 py-3 bg-[#FBFAF8] border-b border-[#F1F3F6]">
            <div className="text-[14px] font-bold text-[#1C1917]">{g.group}</div>
            <div className="flex items-center gap-3 md:gap-4 text-[12px]">
              <span className="text-[#8492A6]">รับ <b className="text-[#1C1917] tnum">{nf.format(g.received)}</b></span>
              <span className="text-[#8492A6]">จ่าย <b className="text-[#6D28D9] tnum">{nf.format(g.issued)}</b></span>
              <span className="text-[#8492A6]">เหลือ <b className="text-[#157F4C] tnum">{nf.format(g.remaining)}</b></span>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-[1fr_84px_84px_84px_120px] gap-2 px-5 py-2 text-[11px] font-semibold text-[#A8A29E] border-b border-[#F1F3F6]">
            <div>รุ่น / อุปกรณ์</div><div className="text-right">รับเข้า</div><div className="text-right">จ่ายออก</div><div className="text-right">คงเหลือ</div><div className="text-right pr-1">สถานะ</div>
          </div>
          {g.products.map((p) => <ProductRow key={p.id} p={p} />)}
        </div>
      ))}
    </div>
  )
}

function ProductRow({ p }: { p: ProductSummary }) {
  const [open, setOpen] = useState(false)
  const meta = STOCK_LEVEL_META[p.level]
  return (
    <div className="border-b border-[#F7F8FA] last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left px-4 md:px-5 py-2.5 hover:bg-[#FBFAF8] grid grid-cols-1 gap-1 md:grid-cols-[1fr_84px_84px_84px_120px] md:gap-2 md:items-center">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[#A8A29E] text-[11px] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
          <span className="text-[13px] font-semibold text-[#1C1917] truncate">{p.name}</span>
          <span className="text-[11px] text-[#A8A29E] shrink-0">· {p.lots.length} lot</span>
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap pl-5 md:pl-0 md:contents text-[12.5px]">
          <span className="tnum text-[#3C4A5E] md:text-right md:text-[13px]"><span className="text-[#8492A6] md:hidden">รับ </span>{nf.format(p.received)}</span>
          <span className="tnum text-[#6D28D9] md:text-right md:text-[13px]"><span className="text-[#8492A6] md:hidden">จ่าย </span>{nf.format(p.issued)}</span>
          <span className="tnum font-bold md:text-right md:text-[13px]" style={{ color: meta.color }}><span className="text-[#8492A6] font-normal md:hidden">เหลือ </span>{nf.format(p.remaining)}</span>
          <span className="md:text-right md:pr-1 ml-auto md:ml-0">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label} ({nf.format(p.remaining)})</span>
          </span>
        </div>
      </button>
      {open && (
        <div className="bg-[#FBFAF8] px-5 pb-3 pt-1">
          <div className="flex justify-end mb-1">
            <Link href={`/stock/${p.id}`} className="text-[12px] font-semibold text-[#EA580C] hover:underline">ดูรายการเครื่องทั้งหมด ({nf.format(p.received)}) →</Link>
          </div>
          <div className="hidden md:grid grid-cols-[1fr_84px_84px_84px_120px] gap-2 px-2 py-1 text-[11px] text-[#A8A29E]">
            <div className="pl-5">Lot</div><div className="text-right">รับ</div><div className="text-right">จ่าย</div><div className="text-right">เหลือ</div><div />
          </div>
          {p.lots.map((l) => (
            <Link key={l.id} href={`/stock/${p.id}?lot=${encodeURIComponent(l.lotCode)}`}
              className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_84px_84px_84px_120px] md:gap-2 px-2 py-1.5 text-[12.5px] border-t border-[#F1F3F6] hover:bg-white rounded">
              <div className="text-[#3C4A5E] tnum flex items-center gap-1">Lot {l.lotCode} <span className="text-[#C4BFB9]">›</span></div>
              <div className="flex items-center gap-x-3 flex-wrap md:contents">
                <span className="tnum text-[#5A6B82] md:text-right"><span className="text-[#A8A29E] md:hidden">รับ </span>{nf.format(l.received)}</span>
                <span className="tnum text-[#6D28D9] md:text-right"><span className="text-[#A8A29E] md:hidden">จ่าย </span>{nf.format(l.issued)}</span>
                <span className="tnum font-semibold md:text-right" style={{ color: l.remaining <= 0 ? '#C13540' : l.remaining <= p.lowStockQty ? '#B45309' : '#157F4C' }}><span className="text-[#A8A29E] font-normal md:hidden">เหลือ </span>{nf.format(l.remaining)}</span>
                <span className="hidden md:block" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
