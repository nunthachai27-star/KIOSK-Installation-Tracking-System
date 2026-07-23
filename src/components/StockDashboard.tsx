'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { GroupSummary, ProductSummary, StockStatusLevel } from '@/lib/stock'
import { STOCK_LEVEL_META } from '@/lib/stock'

const nf = new Intl.NumberFormat('th-TH')
type Kpi = { received: number; issued: number; borrowed: number; remaining: number; low: number; out: number; products: number }

// A unit matched by serial via /api/stock/search.
type SerialHit = {
  id: string; serialBMS: string | null; serialNo: string | null; color: string | null
  status: 'IN_STOCK' | 'ISSUED' | 'BORROWED'; lotCode: string; productId: string; productName: string; group: string
  hospitalName: string | null; jobId: string | null; jobCode: string | null
  borrowerName: string | null; borrowerPhone: string | null
}

const HIT_STATUS = {
  IN_STOCK: { label: 'ในคลัง', color: '#157F4C', bg: '#E2F3EA' },
  ISSUED: { label: 'จ่ายออกแล้ว', color: '#6D28D9', bg: '#F3EEFF' },
  BORROWED: { label: 'ถูกยืม', color: '#1B5FD9', bg: '#E4EEFF' },
}

export function StockDashboard({ kpi, groups }: { kpi: Kpi; groups: GroupSummary[] }) {
  const [q, setQ] = useState('')
  const [level, setLevel] = useState<'' | StockStatusLevel>('')
  const [group, setGroup] = useState('')
  const [hits, setHits] = useState<SerialHit[]>([])
  const [hitTotal, setHitTotal] = useState(0)
  const [searching, setSearching] = useState(false)

  const ql = q.trim().toLowerCase()

  // Serials live per-unit in the DB, so they cannot be filtered from the summary
  // the page was rendered with — look them up server-side as the user types.
  useEffect(() => {
    const term = q.trim()
    const ctrl = new AbortController()
    // All state updates happen inside the timer, never synchronously in the
    // effect body (that would cascade a render on every keystroke).
    const t = setTimeout(async () => {
      if (term.length < 2) { setHits([]); setHitTotal(0); setSearching(false); return }
      setSearching(true)
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        if (!res.ok) { setHits([]); setHitTotal(0); return }
        const d = await res.json()
        setHits(d.items ?? []); setHitTotal(d.total ?? 0)
      } catch { /* aborted by the next keystroke */ }
      finally { setSearching(false) }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])
  const filtered = useMemo(() => groups
    .filter((g) => !group || g.group === group)
    .map((g) => ({
      ...g,
      products: g.products.filter((p) =>
        (!ql || p.name.toLowerCase().includes(ql)) && (!level || p.level === level)),
    }))
    .filter((g) => g.products.length > 0), [groups, group, ql, level])

  // Proportion of received that is issued / borrowed / remaining (for the KPI bar).
  const base = Math.max(1, kpi.received)
  const pct = (n: number) => `${(n / base) * 100}%`
  const cards = [
    { icon: '📥', bg: '#E4EEFF', label: 'รับเข้ารวม', value: kpi.received, sub: 'ชิ้น', color: '#1C1917', bar: false },
    { icon: '📤', bg: '#F3EEFF', label: 'จ่ายออกแล้ว', value: kpi.issued, sub: 'ชิ้น', color: '#1C1917', bar: false },
    { icon: '📦', bg: '#E2F3EA', label: 'คงเหลือในคลัง', value: kpi.remaining, sub: kpi.borrowed > 0 ? `ถูกยืมอยู่ ${nf.format(kpi.borrowed)} ชิ้น` : 'ชิ้น', color: '#157F4C', bar: true },
    { icon: '⚠️', bg: '#FBE4E4', label: 'ใกล้หมด / หมด', value: kpi.low + kpi.out, sub: `ใกล้หมด ${nf.format(kpi.low)} · หมด ${nf.format(kpi.out)}`, color: kpi.low + kpi.out > 0 ? '#C13540' : '#1C1917', bar: false },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="ds-card ds-hover px-5 py-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#8492A6] truncate">{c.label}</div>
                <div className="text-[26px] leading-none font-bold tnum mt-1" style={{ color: c.color }}>{nf.format(c.value)}</div>
                <div className="text-[11px] text-[#A8A29E] mt-0.5">{c.sub}</div>
              </div>
            </div>
            {c.bar && (
              <div className="flex h-1.5 rounded-full overflow-hidden bg-[#EDF0F5]" title={`จ่ายออก ${nf.format(kpi.issued)} · ถูกยืม ${nf.format(kpi.borrowed)} · คงเหลือ ${nf.format(kpi.remaining)}`}>
                <span className="h-full" style={{ width: pct(kpi.issued), background: '#6D28D9' }} />
                {kpi.borrowed > 0 && <span className="h-full" style={{ width: pct(kpi.borrowed), background: '#1B5FD9' }} />}
                <span className="h-full" style={{ width: pct(kpi.remaining), background: '#157F4C' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารุ่น/อุปกรณ์ หรือ Serial No. / S/N BMS…"
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

      {/* serial matches — units found by Serial NO. / S/N BMS across all products */}
      {q.trim().length >= 2 && (searching || hits.length > 0) && (
        <div className="ds-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap px-4 md:px-5 py-3 bg-[#FFF7ED] border-b border-[#FDE3C8]">
            <div className="text-[14px] font-bold text-[#1C1917]">
              🔎 ผลค้นหา Serial
              {!searching && <span className="text-[12px] font-semibold text-[#8492A6] ml-2">พบ {nf.format(hitTotal)} เครื่อง</span>}
            </div>
            {hitTotal > hits.length && (
              <span className="text-[11.5px] text-[#B45309]">แสดง {nf.format(hits.length)} รายการแรก · พิมพ์ให้เจาะจงขึ้นเพื่อผลที่แคบลง</span>
            )}
          </div>
          {searching && hits.length === 0 ? (
            <div className="px-5 py-6 text-[13px] text-[#8492A6]">กำลังค้นหา…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[760px]">
                <thead>
                  <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
                    <th className="px-3 py-2.5 font-semibold">Serial BMS</th>
                    <th className="px-3 py-2.5 font-semibold">Serial NO.</th>
                    <th className="px-3 py-2.5 font-semibold">รุ่น / อุปกรณ์</th>
                    <th className="px-3 py-2.5 font-semibold">Lot</th>
                    <th className="px-3 py-2.5 font-semibold">สถานะ</th>
                    <th className="px-3 py-2.5 font-semibold">โรงพยาบาล / ผู้ยืม</th>
                    <th className="px-3 py-2.5 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {hits.map((h) => {
                    const st = HIT_STATUS[h.status]
                    return (
                      <tr key={h.id} className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {h.serialBMS ? <span className="font-bold tnum text-[#1C1917]">{h.serialBMS}</span> : <span className="text-[#C7CDD6] text-[12px]">— รอจ่ายออก</span>}
                        </td>
                        <td className="px-3 py-2 tnum text-[#3C4A5E] whitespace-nowrap">{h.serialNo ?? '—'}</td>
                        <td className="px-3 py-2 text-[#1C1917] max-w-[220px] truncate" title={`${h.group} · ${h.productName}`}>{h.productName}</td>
                        <td className="px-3 py-2 tnum text-[#5A6B82] whitespace-nowrap">{h.lotCode}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={h.borrowerName ?? h.hospitalName ?? ''}>
                          {h.status === 'BORROWED' && h.borrowerName
                            ? <Link href="/loans" className="text-[#1B5FD9] hover:underline">🤝 {h.borrowerName}</Link>
                            : h.jobId
                              ? <Link href={`/jobs/${h.jobId}`} className="text-[#EA580C] hover:underline">{h.hospitalName ?? h.jobCode}</Link>
                              : <span className="text-[#5A6B82]">{h.hospitalName ?? '—'}</span>}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Link href={`/stock/${h.productId}?lot=${encodeURIComponent(h.lotCode)}&q=${encodeURIComponent(h.serialNo ?? h.serialBMS ?? '')}`}
                            className="text-[12px] font-semibold text-[#EA580C] hover:underline">เปิดในคลัง →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* grouped list */}
      {filtered.length === 0 ? (
        <div className="ds-card p-8 text-center text-[#8492A6] text-sm">
          {hits.length > 0 ? 'ไม่มีชื่อรุ่น/อุปกรณ์ที่ตรงกับคำค้น — ดูผลค้นหา Serial ด้านบน' : 'ไม่พบรายการ'}
        </div>
      ) : filtered.map((g) => (
        <div key={g.group} className="ds-card overflow-hidden">
          <div className="px-4 md:px-5 pt-3.5 pb-3 bg-[#FBFAF8] border-b border-[#F1F3F6]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-[#EA580C]" />
                <span className="text-[14px] font-bold text-[#1C1917]">{g.group}</span>
                <span className="text-[11px] font-semibold text-[#5A6B82] bg-white border border-[#EEF1F5] rounded-full px-2 py-0.5">{g.products.length} รุ่น</span>
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-[12px]">
                <span className="text-[#8492A6]">รับ <b className="text-[#1C1917] tnum">{nf.format(g.received)}</b></span>
                <span className="text-[#8492A6]">จ่าย <b className="text-[#6D28D9] tnum">{nf.format(g.issued)}</b></span>
                <span className="text-[#8492A6]">เหลือ <b className="text-[#157F4C] tnum">{nf.format(g.remaining)}</b></span>
              </div>
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
