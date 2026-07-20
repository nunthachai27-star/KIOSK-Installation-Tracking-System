'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect, type ReactNode } from 'react'

type Status = 'NORMAL' | 'PENDING' | 'PROBLEM'
type Item = {
  id: string; name: string; province: string; jobCount: number; itemCount: number
  products: string[]; status: Status; updatedAt: string | null
}
type Props = {
  items: Item[]
  stats: { hospitals: number; jobs: number; units: number; problem: number }
  overview: { normal: number; pending: number; problem: number }
  topProvinces: { province: string; count: number }[]
  topProducts: { name: string; count: number }[]
  provinceOptions: string[]
  productOptions: string[]
}

const nf = new Intl.NumberFormat('th-TH')
const dtFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const tmFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' })

const STATUS: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  NORMAL: { label: 'ปกติ', color: '#157F4C', bg: '#E2F3EA', dot: '#22A565' },
  PENDING: { label: 'มีงานค้าง', color: '#B45309', bg: '#FBEBCB', dot: '#F59E0B' },
  PROBLEM: { label: 'มีปัญหา', color: '#C13540', bg: '#FBE4E4', dot: '#EF4444' },
}

function Donut({ normal, pending, problem }: { normal: number; pending: number; problem: number }) {
  const total = Math.max(1, normal + pending + problem)
  const segs = [
    { v: normal, c: '#22A565' },
    { v: pending, c: '#F59E0B' },
    { v: problem, c: '#EF4444' },
  ]
  const C = 2 * Math.PI * 42
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" className="w-[104px] h-[104px] -rotate-90 shrink-0">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F3F6" strokeWidth="14" />
      {segs.map((s, i) => {
        const len = (s.v / total) * C
        const el = <circle key={i} cx="50" cy="50" r="42" fill="none" stroke={s.c} strokeWidth="14"
          strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
        offset += len
        return el
      })}
    </svg>
  )
}

export function HospitalDashboard({ items, stats, overview, topProvinces, topProducts, provinceOptions, productOptions }: Props) {
  const [q, setQ] = useState('')
  const [province, setProvince] = useState('')
  const [status, setStatus] = useState<'' | Status>('')
  const [product, setProduct] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const counts = useMemo(() => ({
    all: items.length,
    PENDING: items.filter((i) => i.status === 'PENDING').length,
    PROBLEM: items.filter((i) => i.status === 'PROBLEM').length,
    NORMAL: items.filter((i) => i.status === 'NORMAL').length,
  }), [items])

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((i) => {
    if (status && i.status !== status) return false
    if (province && i.province !== province) return false
    if (product && !i.products.includes(product)) return false
    if (ql && !`${i.name} ${i.province}`.toLowerCase().includes(ql)) return false
    return true
  }), [items, status, province, product, ql])

  useEffect(() => { setPage(1) }, [status, province, product, ql, perPage])
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const cur = Math.min(page, pageCount)
  const rows = filtered.slice((cur - 1) * perPage, cur * perPage)
  const from = filtered.length === 0 ? 0 : (cur - 1) * perPage + 1
  const to = Math.min(cur * perPage, filtered.length)
  const clearAll = () => { setQ(''); setProvince(''); setStatus(''); setProduct('') }
  const fmtWhen = (iso: string | null) => (iso ? `${dtFmt.format(new Date(iso))} ${tmFmt.format(new Date(iso))} น.` : '—')

  const ovTotal = Math.max(1, overview.normal + overview.pending + overview.problem)
  const pct = (n: number) => ((n / ovTotal) * 100).toFixed(1)

  const statCards = [
    { icon: '🏥', bg: '#E4EEFF', label: 'โรงพยาบาลทั้งหมด', value: stats.hospitals, unit: 'แห่ง', color: '#1C1917' },
    { icon: '💼', bg: '#E2F3EA', label: 'งานทั้งหมด', value: stats.jobs, unit: 'งาน', color: '#1C1917' },
    { icon: '📦', bg: '#F3EEFF', label: 'สินค้าที่ติดตั้งแล้ว', value: stats.units, unit: 'ชิ้น', color: '#1C1917' },
    { icon: '⚠️', bg: '#FBE4E4', label: 'โรงพยาบาลที่มีปัญหา', value: stats.problem, unit: 'แห่ง', color: stats.problem > 0 ? '#C13540' : '#1C1917' },
  ]

  const tabs: { key: '' | Status; label: string; icon: string; n: number }[] = [
    { key: '', label: 'ทั้งหมด', icon: '🏥', n: counts.all },
    { key: 'PENDING', label: 'มีงานค้าง', icon: '📄', n: counts.PENDING },
    { key: 'PROBLEM', label: 'มีปัญหา', icon: '⚠️', n: counts.PROBLEM },
    { key: 'NORMAL', label: 'ติดตั้งแล้ว', icon: '✅', n: counts.NORMAL },
  ]

  const sel = 'border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#EA580C]'

  return (
    <div className="flex flex-col gap-4">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="ds-card ds-hover px-5 py-4 flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#8492A6] truncate">{c.label}</div>
              <div className="text-[26px] leading-none font-bold tnum mt-1" style={{ color: c.color }}>{nf.format(c.value)}</div>
              <div className="text-[11px] text-[#A8A29E] mt-0.5">{c.unit}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        {/* main: filters + table */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* search + filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงพยาบาล จังหวัด หรือรหัสงาน…"
                className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
              {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
            </div>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={sel} aria-label="จังหวัด/เขต">
              <option value="">ทุกจังหวัด/เขต</option>
              {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as '' | Status)} className={sel} aria-label="สถานะ">
              <option value="">ทุกสถานะ</option>
              <option value="NORMAL">ปกติ</option>
              <option value="PENDING">มีงานค้าง</option>
              <option value="PROBLEM">มีปัญหา</option>
            </select>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className={sel} aria-label="ประเภทสินค้า">
              <option value="">ทุกประเภทสินค้า</option>
              {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={clearAll} title="ล้างตัวกรอง"
              className="w-9 h-9 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F4F3F1]">⚙</button>
          </div>

          {/* tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setStatus(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold border ${status === t.key ? 'bg-[#FFEDE1] text-[#EA580C] border-[#FAD3B8]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
                <span>{t.icon}</span>{t.label}
                <span className={`min-w-[20px] text-center rounded-full px-1 text-[11px] font-bold tnum ${status === t.key ? 'bg-[#FBD9C4] text-[#C2410C]' : 'bg-[#ECEAE8] text-[#78716C]'}`}>{nf.format(t.n)}</span>
              </button>
            ))}
          </div>

          {/* table */}
          <div className="ds-card overflow-x-auto">
            <table className="w-full text-[13px] min-w-[760px]">
              <thead>
                <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
                  <th className="px-4 py-3 font-semibold">โรงพยาบาล</th>
                  <th className="px-4 py-3 font-semibold">จังหวัด</th>
                  <th className="px-4 py-3 font-semibold">งาน</th>
                  <th className="px-4 py-3 font-semibold">สินค้า</th>
                  <th className="px-4 py-3 font-semibold">สถานะล่าสุด</th>
                  <th className="px-4 py-3 font-semibold">อัปเดตล่าสุด</th>
                  <th className="px-4 py-3 font-semibold text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8492A6]">ไม่พบโรงพยาบาล</td></tr>}
                {rows.map((h) => {
                  const st = STATUS[h.status]
                  return (
                    <tr key={h.id} className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 shrink-0 rounded-lg bg-[#EEF3FA] text-[#5A6B82] grid place-items-center">🏢</span>
                          <div className="min-w-0"><div className="font-semibold text-[#1C1917] truncate max-w-[200px]">{h.name}</div><div className="text-[11px] text-[#8492A6] truncate max-w-[200px]">{h.province}</div></div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[#5A6B82] whitespace-nowrap">{h.province}</td>
                      <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#E4EEFF] text-[#1B5FD9] tnum">{nf.format(h.jobCount)} งาน</span></td>
                      <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#F3EEFF] text-[#6D28D9] tnum">{nf.format(h.itemCount)} ชิ้น</span></td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: st.bg, color: st.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />{st.label}</span></td>
                      <td className="px-4 py-2.5 text-[11px] text-[#A8A29E] whitespace-nowrap">{fmtWhen(h.updatedAt)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap"><Link href={`/hospitals/${h.id}`} className="text-[12.5px] font-semibold text-[#EA580C] hover:underline">ดูรายละเอียด ›</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[12.5px] text-[#8492A6]">แสดง {nf.format(from)} - {nf.format(to)} จาก {nf.format(filtered.length)} โรงพยาบาล</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[12px] text-[#8492A6]">แสดงต่อหน้า
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="border border-[#D6DFEA] rounded-lg px-2 py-1 text-[12.5px] outline-none">
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <Pg onClick={() => setPage(Math.max(1, cur - 1))} disabled={cur === 1}>‹</Pg>
                  {pageList(cur, pageCount).map((p, i) => p === 0
                    ? <span key={`e${i}`} className="px-1.5 text-[#C4BFB9]">…</span>
                    : <Pg key={p} onClick={() => setPage(p)} active={p === cur}>{nf.format(p)}</Pg>)}
                  <Pg onClick={() => setPage(Math.min(pageCount, cur + 1))} disabled={cur === pageCount}>›</Pg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right sidebar */}
        <div className="flex flex-col gap-4">
          <div className="ds-card p-5">
            <div className="text-[14px] font-bold mb-3">สรุปภาพรวม</div>
            <div className="flex items-center gap-4">
              <Donut normal={overview.normal} pending={overview.pending} problem={overview.problem} />
              <div className="flex flex-col gap-2 text-[12.5px]">
                {[['#22A565', 'ปกติ', overview.normal], ['#F59E0B', 'มีงานค้าง', overview.pending], ['#EF4444', 'มีปัญหา', overview.problem]].map(([c, l, n]) => (
                  <div key={l as string} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c as string }} />
                    <span className="text-[#5A6B82] flex-1">{l}</span>
                    <span className="font-bold tnum text-[#1C1917]">{nf.format(n as number)}</span>
                    <span className="text-[#A8A29E] tnum w-10 text-right">{pct(n as number)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/report" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#EA580C] hover:underline">ดูรายงานสรุปทั้งหมด →</Link>
          </div>

          <div className="ds-card p-5">
            <div className="text-[14px] font-bold mb-3">จังหวัดที่มีงานค้างมากที่สุด</div>
            {topProvinces.length === 0 ? <div className="text-[12.5px] text-[#8492A6]">ไม่มีงานค้าง</div> : (
              <div className="flex flex-col gap-2.5">
                {topProvinces.map((p, i) => (
                  <div key={p.province} className="flex items-center gap-3">
                    <span className="w-5 h-5 shrink-0 rounded-md bg-[#F1F3F6] text-[#78716C] grid place-items-center text-[11px] font-bold tnum">{i + 1}</span>
                    <span className="flex-1 text-[13px] text-[#3C4A5E] truncate">{p.province}</span>
                    <span className="min-w-[24px] text-center rounded-full px-1.5 py-0.5 text-[11.5px] font-bold tnum bg-[#FBEBCB] text-[#B45309]">{nf.format(p.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ds-card p-5">
            <div className="text-[14px] font-bold mb-3">สินค้าที่ติดตั้งมากที่สุด</div>
            <div className="flex flex-col gap-2.5">
              {topProducts.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="flex-1 text-[13px] text-[#3C4A5E] truncate" title={p.name}>{p.name}</span>
                  <span className="min-w-[36px] text-center rounded-full px-2 py-0.5 text-[11.5px] font-bold tnum bg-[#E4EEFF] text-[#1B5FD9]">{nf.format(p.count)}</span>
                </div>
              ))}
            </div>
            <Link href="/products" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#EA580C] hover:underline">ดูทั้งหมด →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function pageList(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, cur, cur - 1, cur + 1])
  const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const res: number[] = []
  for (let i = 0; i < arr.length; i++) { if (i > 0 && arr[i] - arr[i - 1] > 1) res.push(0); res.push(arr[i]) }
  return res
}

function Pg({ onClick, active, disabled, children }: { onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold tnum disabled:text-[#D4CFC9] ${active ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F0EEEC]'}`}>
      {children}
    </button>
  )
}
