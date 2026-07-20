'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { ScanButton } from './ScanButton'

type Item = {
  id: string; lotCode: string; seq: number | null; serialBMS: string | null; serialNo: string | null
  color: string | null; status: 'IN_STOCK' | 'ISSUED'; receivedDate: string | null; issuedDate: string | null
  deliveredDate: string | null; hospitalName: string | null; jobId: string | null; jobCode: string | null
}
type EditField = 'serialBMS' | 'serialNo' | 'color'

const nf = new Intl.NumberFormat('th-TH')
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dFmt.format(new Date(iso)) : '—')
const PER = 50

const STATUS = {
  IN_STOCK: { label: 'ในคลัง', color: '#157F4C', bg: '#E2F3EA' },
  ISSUED: { label: 'จ่ายออกแล้ว', color: '#6D28D9', bg: '#F3EEFF' },
}

export function StockItemList({ items: initial, lotCodes, initialLot }: { items: Item[]; lotCodes: string[]; initialLot: string }) {
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [q, setQ] = useState('')
  const [lot, setLot] = useState(initialLot)
  const [status, setStatus] = useState<'' | 'IN_STOCK' | 'ISSUED'>('')
  const [page, setPage] = useState(1)

  const patchField = (id: string, patch: Partial<Record<EditField, string | null>>) =>
    setItems((x) => x.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((i) => {
    if (lot && i.lotCode !== lot) return false
    if (status && i.status !== status) return false
    if (ql && ![i.serialBMS, i.serialNo, i.hospitalName, i.jobCode].some((v) => (v ?? '').toLowerCase().includes(ql))) return false
    return true
  }), [items, lot, status, ql])

  useEffect(() => { setPage(1) }, [ql, lot, status])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER))
  const cur = Math.min(page, pageCount)
  const rows = filtered.slice((cur - 1) * PER, cur * PER)

  return (
    <div className="flex flex-col gap-3">
      {/* filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา serial, โรงพยาบาล, เลขที่งาน…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        <select value={lot} onChange={(e) => setLot(e.target.value)} className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#EA580C]">
          <option value="">ทุก Lot</option>
          {lotCodes.map((l) => <option key={l} value={l}>Lot {l}</option>)}
        </select>
        {(['', 'IN_STOCK', 'ISSUED'] as const).map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${status === s ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {s === '' ? 'ทั้งหมด' : STATUS[s].label}
          </button>
        ))}
      </div>

      <div className="text-[12.5px] text-[#8492A6]">พบ {nf.format(filtered.length)} เครื่อง · <span className="text-[#A8A29E]">คลิกช่อง Serial NO. / สี เพื่อแก้ไข · กด 📷 สแกนบาร์โค้ด/QR (มือถือ) เพื่อลดกรอกผิด · S/N BMS กำหนดอัตโนมัติเมื่อจ่ายออก</span></div>

      {/* table */}
      <div className="ds-card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[900px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-3 py-2.5 font-semibold">Lot</th>
              <th className="px-3 py-2.5 font-semibold">Serial BMS</th>
              <th className="px-3 py-2.5 font-semibold">Serial NO.</th>
              <th className="px-3 py-2.5 font-semibold">สี</th>
              <th className="px-3 py-2.5 font-semibold">สถานะ</th>
              <th className="px-3 py-2.5 font-semibold">โรงพยาบาล</th>
              <th className="px-3 py-2.5 font-semibold">รับเข้า</th>
              <th className="px-3 py-2.5 font-semibold">จ่ายออก</th>
              <th className="px-3 py-2.5 font-semibold">ส่งถึง รพ.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#8492A6]">ไม่พบรายการ</td></tr>}
            {rows.map((it) => <StockItemRow key={it.id} it={it} onPatched={(p) => patchField(it.id, p)} />)}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-[#8492A6]">หน้า {nf.format(cur)} / {nf.format(pageCount)}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, cur - 1))} disabled={cur === 1} className="min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] hover:bg-[#F0EEEC] disabled:text-[#D4CFC9]">‹</button>
            <button onClick={() => setPage(Math.min(pageCount, cur + 1))} disabled={cur === pageCount} className="min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] hover:bg-[#F0EEEC] disabled:text-[#D4CFC9]">›</button>
          </div>
        </div>
      )}
    </div>
  )
}

function StockItemRow({ it, onPatched }: { it: Item; onPatched: (p: Partial<Record<EditField, string | null>>) => void }) {
  const st = STATUS[it.status]

  // Returns an error message on failure (e.g. duplicate serial), else null.
  async function save(field: EditField, value: string): Promise<string | null> {
    const next = value.trim() || null
    if ((it[field] ?? null) === next) return null // unchanged
    const res = await fetch(`/api/stock/items/${it.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) { onPatched({ [field]: next }); return null }
    const d = await res.json().catch(() => null)
    return d?.message || 'บันทึกไม่สำเร็จ'
  }

  return (
    <tr className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
      <td className="px-3 py-1.5 text-[#5A6B82] tnum whitespace-nowrap">{it.lotCode}</td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        {it.serialBMS
          ? <span className="font-bold tnum text-[#1C1917]">{it.serialBMS}</span>
          : <span className="text-[#C7CDD6] text-[12px]" title="S/N BMS กำหนดอัตโนมัติเมื่อจ่ายออกให้โรงพยาบาล (สร้างงาน)">— รอจ่ายออก</span>}
      </td>
      <td className="px-1.5 py-1"><EditCell value={it.serialNo} placeholder="เพิ่มเลขเครื่อง" tnum scan onSave={(v) => save('serialNo', v)} /></td>
      <td className="px-1.5 py-1"><EditCell value={it.color} placeholder="เพิ่มสี" onSave={(v) => save('color', v)} /></td>
      <td className="px-3 py-1.5"><span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
      <td className="px-3 py-1.5 text-[#1C1917] max-w-[200px] truncate" title={it.hospitalName ?? ''}>
        {it.jobId ? <Link href={`/jobs/${it.jobId}`} className="text-[#EA580C] hover:underline">{it.hospitalName ?? it.jobCode}</Link> : (it.hospitalName ?? '—')}
      </td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.receivedDate)}</td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.issuedDate)}</td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.deliveredDate)}</td>
    </tr>
  )
}

// Inline-editable cell — saves on blur; brief green flash on success.
// With `scan`, a camera button fills the value from a scanned barcode/QR.
function EditCell({ value, placeholder, tnum, bold, scan, onSave }: {
  value: string | null; placeholder?: string; tnum?: boolean; bold?: boolean; scan?: boolean; onSave: (v: string) => Promise<string | null>
}) {
  const [v, setV] = useState(value ?? '')
  const [flash, setFlash] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { setV(value ?? '') }, [value])

  async function commit(text: string) {
    if ((text.trim() || '') === (value ?? '')) return
    setErr('')
    const msg = await onSave(text)
    if (msg) { setErr(msg); setV(value ?? '') } // rejected (e.g. duplicate) — revert
    else { setFlash(true); setTimeout(() => setFlash(false), 900) }
  }

  const input = (
    <input value={v} onChange={(e) => { setV(e.target.value); if (err) setErr('') }} onBlur={() => commit(v)} placeholder={placeholder}
      className={`w-full min-w-[80px] bg-transparent border rounded px-2 py-1 text-[13px] outline-none placeholder:text-[#C7CDD6] placeholder:font-normal ${tnum ? 'tnum' : ''} ${bold ? 'font-bold text-[#1C1917]' : 'text-[#3C4A5E]'} ${err ? 'border-[#C13540] bg-[#FBE4E4]' : flash ? 'border-[#22A565] bg-[#EAF7EF]' : 'border-transparent hover:border-[#E1E8F2] focus:border-[#EA580C] focus:bg-white'}`} />
  )
  return (
    <div>
      {scan ? (
        <div className="flex items-center gap-1">
          {input}
          <ScanButton className="w-7 h-7 shrink-0 grid place-items-center rounded-md border border-[#D6DFEA] text-[13px] hover:bg-[#F4F3F1]"
            onScan={(text) => { setV(text); commit(text) }} />
        </div>
      ) : input}
      {err && <div className="text-[10.5px] text-[#C13540] mt-0.5 max-w-[180px]">⚠ {err}</div>}
    </div>
  )
}
