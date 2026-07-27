'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { ScanButton } from './ScanButton'

type Item = {
  id: string; lotCode: string; seq: number | null; serialBMS: string | null; serialNo: string | null
  color: string | null; status: 'IN_STOCK' | 'ISSUED' | 'BORROWED' | 'CLAIM'; receivedDate: string | null; issuedDate: string | null
  deliveredDate: string | null; hospitalName: string | null; jobId: string | null; jobCode: string | null
  borrowerName: string | null; borrowerPhone: string | null; dueDate: string | null
  claimIssueId: string | null; claimMachineSerial: string | null
}
type EditField = 'serialBMS' | 'serialNo' | 'color'

const nf = new Intl.NumberFormat('th-TH')
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dFmt.format(new Date(iso)) : '—')
const PER = 50

const STATUS = {
  IN_STOCK: { label: 'ในคลัง', color: '#157F4C', bg: '#E2F3EA' },
  ISSUED: { label: 'จ่ายออกแล้ว', color: '#6D28D9', bg: '#F3EEFF' },
  BORROWED: { label: 'ถูกยืม', color: '#1B5FD9', bg: '#E4EEFF' },
  CLAIM: { label: 'เคลม', color: '#EA580C', bg: '#FCE7D6' },
}

export function StockItemList({ items: initial, lots, initialLot, initialQ = '' }: { items: Item[]; lots: { id: string; lotCode: string }[]; initialLot: string; initialQ?: string }) {
  const lotCodes = lots.map((l) => l.lotCode)
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [q, setQ] = useState(initialQ)
  const [lot, setLot] = useState(initialLot)
  const [status, setStatus] = useState<'' | 'IN_STOCK' | 'ISSUED' | 'BORROWED' | 'CLAIM'>('')
  const [page, setPage] = useState(1)
  // Add-more-units-into-an-existing-lot control.
  const [adding, setAdding] = useState(false)
  const [addLot, setAddLot] = useState('')
  const [addCount, setAddCount] = useState('1')
  const [addBusy, setAddBusy] = useState(false)

  function openAdd() {
    setAddLot(lot || lots[0]?.lotCode || '')
    setAddCount('1')
    setAdding(true)
  }
  async function addUnits() {
    // When viewing a specific lot, always add into THAT lot (no cross-lot mistakes).
    const targetCode = lot || addLot
    const target = lots.find((l) => l.lotCode === targetCode)
    if (!target || addBusy) return
    const count = Math.min(200, Math.max(1, Math.trunc(Number(addCount) || 1)))
    setAddBusy(true)
    try {
      const res = await fetch(`/api/stock/lots/${target.id}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count }),
      })
      if (res.ok) {
        const created = await res.json() as Item[]
        setItems((x) => [...x, ...created])
        setLot(target.lotCode); setStatus('') // jump the view to the lot so the new blank rows are visible
        setAdding(false)
      } else {
        const d = await res.json().catch(() => null)
        window.alert(d?.message || 'เพิ่มไม่สำเร็จ')
      }
    } finally { setAddBusy(false) }
  }

  const patchField = (id: string, patch: Partial<Record<EditField, string | null>>) =>
    setItems((x) => x.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const dropItem = (id: string) => setItems((x) => x.filter((it) => it.id !== id))

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
        {(['', 'IN_STOCK', 'BORROWED', 'ISSUED', 'CLAIM'] as const).map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${status === s ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {s === '' ? 'ทั้งหมด' : STATUS[s].label}
          </button>
        ))}
        {lots.length > 0 && !adding && (
          <button onClick={openAdd} title="เพิ่มเครื่องเข้า Lot ที่มีอยู่ (กรณีสร้างครั้งแรกมาไม่ครบ)"
            className="ml-auto px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border border-[#EA580C] text-[#EA580C] bg-white hover:bg-[#FFF3EC]">＋ เพิ่มเครื่องใน Lot{lot ? ` ${lot}` : ''}</button>
        )}
      </div>

      {adding && (
        <div className="flex items-end gap-2 flex-wrap rounded-xl bg-[#FBFAF8] border border-[#EEEAE6] px-3 py-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] text-[#8492A6]">Lot</label>
            {lot ? (
              // Locked to the lot currently in view — no cross-lot switching.
              <div className="border border-[#EEEAE6] rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#1C1917] bg-white">Lot {lot}</div>
            ) : (
              <select value={addLot} onChange={(e) => setAddLot(e.target.value)}
                className="border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] bg-white outline-none focus:border-[#EA580C]">
                {lots.map((l) => <option key={l.id} value={l.lotCode}>Lot {l.lotCode}</option>)}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] text-[#8492A6]">จำนวน (เครื่อง)</label>
            <input type="number" min={1} max={200} value={addCount} onChange={(e) => setAddCount(e.target.value)}
              className="w-24 border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] tnum outline-none focus:border-[#EA580C]" />
          </div>
          <button disabled={addBusy || !(lot || addLot)} onClick={addUnits}
            className="bg-[#EA580C] text-white text-[12.5px] font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] disabled:opacity-50">
            {addBusy ? 'กำลังเพิ่ม…' : '＋ เพิ่มเข้า Lot'}
          </button>
          <button onClick={() => setAdding(false)} className="text-[12.5px] text-[#5A6B82] rounded-lg px-3 py-2 hover:bg-[#F0EEEC]">ยกเลิก</button>
          <span className="text-[11.5px] text-[#A8A29E] pb-2">เพิ่มเป็นเครื่องเปล่า (ยังไม่มี Serial) แล้วค่อยกรอกเลขในตารางทีหลัง</span>
        </div>
      )}

      <div className="text-[12.5px] text-[#8492A6]">พบ {nf.format(filtered.length)} เครื่อง · <span className="text-[#A8A29E]">คลิกช่อง Serial NO. / สี เพื่อแก้ไข · กด 📷 สแกนบาร์โค้ด/QR (มือถือ) เพื่อลดกรอกผิด · S/N BMS กำหนดอัตโนมัติเมื่อจ่ายออก · 🔒 รายการที่จ่ายออกแล้วจะล็อก Serial NO. แก้ไข/ลบไม่ได้</span></div>

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
              <th className="px-3 py-2.5 font-semibold">โรงพยาบาล / ผู้ยืม</th>
              <th className="px-3 py-2.5 font-semibold">รับเข้า</th>
              <th className="px-3 py-2.5 font-semibold">จ่ายออก</th>
              <th className="px-3 py-2.5 font-semibold">ส่งถึง รพ.</th>
              <th className="px-2 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-[#8492A6]">ไม่พบรายการ</td></tr>}
            {rows.map((it) => <StockItemRow key={it.id} it={it} onPatched={(p) => patchField(it.id, p)} onDeleted={() => dropItem(it.id)} />)}
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

function StockItemRow({ it, onPatched, onDeleted }: { it: Item; onPatched: (p: Partial<Record<EditField, string | null>>) => void; onDeleted: () => void }) {
  const st = STATUS[it.status]
  // Serial NO. is locked once a unit leaves the shelf (issued or cut for a claim).
  const serialLocked = it.status === 'ISSUED' || it.status === 'CLAIM'
  // A unit can only be removed while untouched: in stock and with no serial yet.
  const canDelete = it.status === 'IN_STOCK' && !(it.serialNo ?? '').trim() && !(it.serialBMS ?? '').trim()

  async function remove() {
    if (!window.confirm(`ลบเครื่องนี้ออกจาก Lot ${it.lotCode}?\nลบได้เฉพาะรายการที่ยังไม่มี Serial NO. และยังไม่จ่ายออก`)) return
    const res = await fetch(`/api/stock/items/${it.id}`, { method: 'DELETE' })
    if (res.ok) { onDeleted(); return }
    const d = await res.json().catch(() => null)
    window.alert(d?.message || 'ลบไม่สำเร็จ')
  }

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
          : it.status === 'CLAIM' && it.claimMachineSerial
          ? <span className="font-bold tnum text-[#1C1917]" title="S/N BMS ของตู้ที่เคลม (อะไหล่ชิ้นนี้ถูกตัดไปซ่อมตู้นี้)">{it.claimMachineSerial}</span>
          : <span className="text-[#C7CDD6] text-[12px]" title="S/N BMS กำหนดอัตโนมัติเมื่อจ่ายออกให้โรงพยาบาล (สร้างงาน)">— รอจ่ายออก</span>}
      </td>
      <td className="px-1.5 py-1">
        {serialLocked
          ? <span className="flex items-center gap-1 px-2 py-1 text-[13px] tnum text-[#1C1917]" title={it.status === 'CLAIM' ? 'ตัดเป็นเคลมแล้ว — ล็อก Serial NO. (แก้ไข/ลบไม่ได้)' : 'จ่ายออกแล้ว — ล็อก Serial NO. (แก้ไข/ลบไม่ได้)'}>
              {it.serialNo ?? '—'}<span className="text-[#B8B2AC] text-[11px]">🔒</span>
            </span>
          : <EditCell value={it.serialNo} placeholder="เพิ่มเลขเครื่อง" tnum scan onSave={(v) => save('serialNo', v)} />}
      </td>
      <td className="px-1.5 py-1"><EditCell value={it.color} placeholder="เพิ่มสี" onSave={(v) => save('color', v)} /></td>
      <td className="px-3 py-1.5">
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        {it.status === 'BORROWED' && it.dueDate && (
          <div className={`text-[10.5px] mt-0.5 whitespace-nowrap ${new Date(it.dueDate) < new Date() ? 'text-[#C13540] font-bold' : 'text-[#A8A29E]'}`}>
            คืน {fmt(it.dueDate)}
          </div>
        )}
      </td>
      <td className="px-3 py-1.5 text-[#1C1917] max-w-[200px] truncate" title={it.borrowerName ?? it.hospitalName ?? ''}>
        {it.status === 'BORROWED' && it.borrowerName ? (
          <Link href="/loans" className="text-[#1B5FD9] hover:underline">
            🤝 {it.borrowerName}
            {it.borrowerPhone && <span className="text-[#8492A6] ml-1.5 tnum text-[11.5px]">{it.borrowerPhone}</span>}
          </Link>
        ) : it.status === 'CLAIM' && it.claimIssueId ? (
          <Link href={`/issues?open=${it.claimIssueId}`} className="text-[#EA580C] hover:underline" title="เปิดรายการเคลมที่ตัดชิ้นนี้ไป">
            🔧 {it.hospitalName ?? 'ดูรายการเคลม'}
          </Link>
        ) : it.jobId ? (
          <Link href={`/jobs/${it.jobId}`} className="text-[#EA580C] hover:underline">{it.hospitalName ?? it.jobCode}</Link>
        ) : (it.hospitalName ?? '—')}
      </td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.receivedDate)}</td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.issuedDate)}</td>
      <td className="px-3 py-1.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(it.deliveredDate)}</td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        {canDelete && (
          <button type="button" onClick={remove} title="ลบรายการนี้ (ยังไม่มี Serial NO. และยังไม่จ่ายออก)"
            className="w-6 h-6 grid place-items-center rounded-md text-[12px] text-[#C4BFB9] hover:text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
        )}
      </td>
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
