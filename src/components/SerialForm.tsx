'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { alertDialog, confirmDialog } from '@/lib/dialog'
import type { SerialNumber, SerialType, SerialStatus } from '@prisma/client'
import { SERIAL_TYPE_LABELS } from '@/lib/serial-types'
import { addBusinessDays } from '@/lib/workdays'
import { Combobox } from './Combobox'
import { ScanButton } from './ScanButton'

const planFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

type Comp = { name: string; quantity: number; needsSerial: boolean }
type UserOpt = { id: string; name: string }
type StockOpt = { id: string; serialNo: string; color: string | null; group: string; product: string; lotCode: string }
// A stock unit the server offers when one serial matches more than one product.
type Candidate = { stockItemId: string; group: string; product: string; lotCode: string; color: string | null; remaining: number }
type StockState = 'DEDUCTED' | 'ISSUED_OTHER' | 'IN_STOCK' | 'NONE'

// Stock-deduction report badge for an assigned component serial.
const STOCK_BADGE: Record<StockState, { label: string; color: string; bg: string }> = {
  DEDUCTED: { label: '✓ ตัดสต็อกแล้ว', color: '#157F4C', bg: '#E2F3EA' },
  IN_STOCK: { label: '📦 มีในคลัง (ยังไม่ตัด)', color: '#1B5FD9', bg: '#E4EEFF' },
  ISSUED_OTHER: { label: '⚠ จ่ายให้งานอื่นแล้ว', color: '#B45309', bg: '#FBEBCB' },
  NONE: { label: '⚠ ไม่มีในคลัง', color: '#8492A6', bg: '#EEF1F5' },
}

const REC_STATUS: { value: SerialStatus; label: string }[] = [
  { value: 'PENDING', label: 'รอลง Serial' },
  { value: 'IN_PROGRESS', label: 'กำลังลง' },
  { value: 'DONE', label: 'ลงครบแล้ว' },
  { value: 'PROBLEM', label: 'ติดปัญหา' },
]

function legacyLabel(s: SerialNumber): string {
  if (s.label) return s.label
  if (s.serialType) return SERIAL_TYPE_LABELS[s.serialType as SerialType] ?? s.serialType
  return 'Serial'
}

export function SerialForm({
  jobId, serials, components, bmsCode, quantity, users, record, currentUser, stockOptions, stockStatus,
}: {
  jobId: string
  serials: SerialNumber[]
  components: Comp[]
  bmsCode: string | null
  quantity: number
  users: UserOpt[]
  record: { staffId: string | null; status: SerialStatus; qcPlannedDate: string | null } | null
  currentUser: { id: string; name: string }
  stockOptions: StockOpt[]
  stockStatus: Record<string, 'DEDUCTED' | 'ISSUED_OTHER' | 'IN_STOCK'>
}) {
  const [stockState, setStockState] = useState<Record<string, StockState>>(stockStatus)
  useEffect(() => { setStockState(stockStatus) }, [stockStatus])
  const [deducting, setDeducting] = useState<Record<string, boolean>>({})
  const stockOf = (serialNo: string): StockState => stockState[serialNo.toUpperCase()] ?? 'NONE'

  // Which serial is waiting for the user to say *which product* to deduct from.
  const [choice, setChoice] = useState<{ serialId: string; serialNo: string; candidates: Candidate[] } | null>(null)

  // แก้ไขเลข S/N BMS ของเครื่อง (inline)
  const [editUnit, setEditUnit] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [renaming, setRenaming] = useState(false)

  // ดูรายการเลข S/N BMS ที่มีแล้ว
  type BmsRow = { serialNo: string; jobCode: string | null; productType: string | null; hospitalName: string | null; isThisJob: boolean }
  const [bmsOpen, setBmsOpen] = useState(false)
  const [bmsData, setBmsData] = useState<{ code: string | null; productType: string; total: number; items: BmsRow[] } | null>(null)
  const [bmsLoading, setBmsLoading] = useState(false)
  const [bmsFilter, setBmsFilter] = useState('all')
  async function openBmsList() {
    setBmsOpen(true); setBmsLoading(true); setBmsData(null); setBmsFilter('all')
    try { const r = await fetch(`/api/jobs/${jobId}/bms-serials`, { cache: 'no-store' }); if (r.ok) setBmsData(await r.json()) }
    finally { setBmsLoading(false) }
  }

  // Deduct an assigned component serial that still shows IN_STOCK (issue it to this job).
  // The same factory serial can exist in several products, so when the server reports the
  // match is ambiguous we ask instead of letting it pick one for us.
  async function deduct(serialId: string, serialNo: string, stockItemId?: string) {
    setDeducting(d => ({ ...d, [serialId]: true }))
    try {
      const res = await fetch('/api/stock/deduct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialId, stockItemId }),
      })
      if (res.ok) {
        setChoice(null)
        setStockState(s => ({ ...s, [serialNo.toUpperCase()]: 'DEDUCTED' }))
        router.refresh()
        return
      }
      const d = await res.json().catch(() => null)
      if (d?.error === 'ambiguous') { setChoice({ serialId, serialNo, candidates: d.candidates ?? [] }); return }
      if (d?.message) await alertDialog(d.message)
    } finally { setDeducting(d => ({ ...d, [serialId]: false })) }
  }
  const router = useRouter()
  const [rows, setRows] = useState(serials)
  const [stock, setStock] = useState<StockOpt[]>(stockOptions)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [filling, setFilling] = useState(false)
  const [fillErr, setFillErr] = useState('')

  const [staffId, setStaffId] = useState(record?.staffId ?? currentUser.id ?? '')
  const [recStatus, setRecStatus] = useState<SerialStatus>(record?.status ?? 'PENDING')
  const [recSaving, setRecSaving] = useState(false)
  const [recSaved, setRecSaved] = useState(false)

  async function saveRecord() {
    setRecSaving(true); setRecSaved(false)
    try {
      const res = await fetch(`/api/jobs/${jobId}/serial-record`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staffId || null, status: recStatus }),
      })
      if (res.ok) { setRecSaved(true); router.refresh() }
    } finally { setRecSaving(false) }
  }

  function setInput(k: string, v: string) { setInputs(i => ({ ...i, [k]: v })) }

  async function post(key: string, body: Record<string, unknown>): Promise<SerialNumber | null> {
    setSaving(s => ({ ...s, [key]: true })); setErrors(e => ({ ...e, [key]: '' }))
    try {
      const res = await fetch(`/api/jobs/${jobId}/serials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) {
        // Prefer the server's reason — a 409 can be a real duplicate or a unit that
        // already left the shelf, and those need different fixes.
        const d = await res.json().catch(() => null)
        setErrors(e => ({ ...e, [key]: d?.message || (res.status === 409 ? 'หมายเลข Serial ซ้ำ' : 'บันทึกไม่สำเร็จ') }))
        return null
      }
      return (await res.json()) as SerialNumber
    } catch {
      setErrors(e => ({ ...e, [key]: 'เกิดข้อผิดพลาด' })); return null
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  async function addBms() {
    const serialNo = (inputs['newbms'] ?? '').trim()
    if (!serialNo) return
    const created = await post('newbms', { serialType: 'BMS', serialNo })
    if (created) { setRows(r => [...r, created]); setInput('newbms', ''); router.refresh() }
  }

  // Keep the available-stock picker in sync with the server after a refresh
  // (issued items removed, returned items re-added).
  useEffect(() => { setStock(stockOptions) }, [stockOptions])

  // Issue a component unit from warehouse stock and attach it to this BMS unit.
  async function issueComponent(unitId: string, compName: string, stockItemId: string) {
    const key = `u:${unitId}:${compName}`
    const created = await post(key, { label: compName, parentId: unitId, stockItemId })
    if (created) {
      setRows(r => [...r, created])
      setStock(s => s.filter(o => o.id !== stockItemId)) // optimistically remove from picker
      router.refresh()
    }
  }

  async function removeSerial(id: string) {
    const res = await fetch(`/api/jobs/${jobId}/serials/${id}`, { method: 'DELETE' })
    if (res.ok) { setRows(r => r.filter(x => x.id !== id && x.parentId !== id)); router.refresh() }
  }

  async function saveRename(unit: SerialNumber) {
    const nv = (editVal ?? '').trim()
    if (!nv || nv === unit.serialNo) { setEditUnit(null); return }
    const ok = await confirmDialog({
      title: 'เปลี่ยน S/N BMS',
      message: `เปลี่ยน "${unit.serialNo}" → "${nv}" ?\nระบบจะไล่อัปเดตเลขนี้ที่ผูกไว้ส่วนอื่นให้ด้วย (คลังสินค้าของอุปกรณ์ที่ตัดออกให้เครื่องนี้ และรายการเคลมที่ผูกกับเครื่องนี้)`,
      confirmText: 'เปลี่ยนเลข', cancelText: 'ยกเลิก',
    })
    if (!ok) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/serials/${unit.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serialNo: nv }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { await alertDialog({ title: 'เปลี่ยนไม่สำเร็จ', message: d?.message || 'ลองใหม่อีกครั้ง' }); return }
      setRows(r => r.map(x => (x.id === unit.id ? { ...x, serialNo: nv } : x)))
      setEditUnit(null)
      router.refresh()
      await alertDialog({ title: 'เปลี่ยนเลขแล้ว', message: `${unit.serialNo} → ${nv}\nอัปเดตในคลัง ${d.stockUpdated ?? 0} รายการ · เคลม ${d.issueUpdated ?? 0} รายการ` })
    } finally { setRenaming(false) }
  }

  // สแกนบาร์โค้ด/QR → หา Serial ในคลังที่ตรง (ตัดช่องว่าง/ขีดออกก่อนเทียบ) แล้วจ่ายออกให้อัตโนมัติ.
  // เหมือนการเลือกจาก Combobox ทุกอย่าง — แค่ได้ค่าจากกล้องแทนการพิมพ์.
  function handleScan(unitId: string, compName: string, code: string) {
    const key = `u:${unitId}:${compName}`
    const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase()
    const nq = norm(code)
    if (!nq) return
    const match = stock.find(o => norm(o.serialNo || '') === nq)
    if (match) { setErrors(e => ({ ...e, [key]: '' })); issueComponent(unitId, compName, match.id) }
    else setErrors(e => ({ ...e, [key]: `ไม่พบ Serial "${code.trim()}" ในคลัง (อาจถูกตัดไปแล้ว หรือคนละรุ่น)` }))
  }

  async function fillUnits() {
    setFilling(true); setFillErr('')
    try {
      const res = await fetch(`/api/jobs/${jobId}/units/fill`, { method: 'POST' })
      const d = await res.json().catch(() => null)
      if (!res.ok) {
        setFillErr(d?.error === 'no-code' ? 'ยังไม่ได้ตั้งรหัส BMS — ตั้งค่า › ประเภทสินค้า'
          : d?.error === 'too-many' ? `จำนวนมากเกินไป (${d.needed}) — ตรวจสอบช่องจำนวน` : 'สร้างไม่สำเร็จ')
        return
      }
      if (d.created?.length) { setRows(r => [...r, ...d.created]); router.refresh() }
    } finally { setFilling(false) }
  }

  async function generateBms() {
    setErrors(e => ({ ...e, newbms: '' }))
    try {
      const res = await fetch(`/api/jobs/${jobId}/serials/next-bms`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErrors(e => ({ ...e, newbms: d?.error === 'no-code' ? 'ยังไม่ได้ตั้งรหัส BMS — ตั้งค่า › ประเภทสินค้า' : 'ออกเลขไม่สำเร็จ' }))
        return
      }
      const { serialNo } = await res.json()
      setInput('newbms', serialNo)
    } catch {
      setErrors(e => ({ ...e, newbms: 'เกิดข้อผิดพลาด' }))
    }
  }

  const units = rows.filter(s => s.serialType === 'BMS')
  const serialComps = components.filter(c => c.needsSerial)
  const infoComps = components.filter(c => !c.needsSerial)
  const legacy = rows.filter(s => s.serialType !== 'BMS' && !s.parentId)
  const inputCls = 'flex-1 border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm'
  // Warehouse-stock picker options (label = factory serial, sub = product context).
  const stockCombo = stock.map(o => ({
    id: o.id,
    label: o.serialNo,
    sub: `${o.group} · ${o.product}${o.color ? ` · ${o.color}` : ''} · Lot ${o.lotCode}`,
  }))

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">

      {choice && (
        <DeductPicker
          serialNo={choice.serialNo}
          candidates={choice.candidates}
          busy={!!deducting[choice.serialId]}
          onCancel={() => setChoice(null)}
          onPick={(stockItemId) => deduct(choice.serialId, choice.serialNo, stockItemId)}
        />
      )}

      {bmsOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-10 bg-[rgba(15,22,33,0.5)] backdrop-blur-[3px]"
          onClick={(e) => { if (e.target === e.currentTarget) setBmsOpen(false) }}>
          <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-[0_12px_44px_rgba(18,26,40,0.2)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF0F3] flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#1C1917]">🔎 เลข S/N BMS ที่มีแล้ว</span>
              {bmsData?.code && <span className="text-[12px] font-semibold text-[var(--brand)] bg-[var(--brand-soft)] rounded-full px-2.5 py-0.5">รหัส {bmsData.code}</span>}
              <button onClick={() => setBmsOpen(false)} className="ml-auto w-8 h-8 grid place-items-center rounded-lg bg-[#F4F6F9] text-[#8492A6] hover:bg-[#E7EBF0]">✕</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {bmsLoading && <div className="py-10 text-center text-[#8492A6] text-sm">⏳ กำลังโหลด…</div>}
              {!bmsLoading && bmsData && (() => {
                const types = [...new Set(bmsData.items.map((i) => i.productType).filter(Boolean))] as string[]
                const shown = bmsFilter === 'all' ? bmsData.items : bmsData.items.filter((i) => i.productType === bmsFilter)
                return (
                  <>
                    <div className="text-[12.5px] text-[#8492A6] mb-2">ทั้งหมด {bmsData.total} เลข · เรียงล่าสุดอยู่บน{bmsData.code ? '' : ' · (ประเภทนี้ยังไม่ตั้งรหัส BMS — แสดงตามประเภทสินค้า)'}</div>
                    {types.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <button onClick={() => setBmsFilter('all')} className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${bmsFilter === 'all' ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>ทั้งหมด ({bmsData.items.length})</button>
                        {types.map((t) => {
                          const n = bmsData.items.filter((i) => i.productType === t).length
                          return <button key={t} onClick={() => setBmsFilter(t)} className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${bmsFilter === t ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>{t} ({n})</button>
                        })}
                      </div>
                    )}
                    {shown.length === 0 ? (
                      <div className="py-8 text-center text-[#96A2B5] text-[13px]">ยังไม่มีเลข S/N BMS</div>
                    ) : (
                      <ul className="flex flex-col divide-y divide-[#F1F4F8] border border-[#EEF2F7] rounded-xl overflow-hidden">
                        {shown.map((r, i) => (
                          <li key={i} className={`flex items-center gap-3 px-3 py-2 ${r.isThisJob ? 'bg-[#F1FBF5]' : ''}`}>
                            <span className="tnum text-[13.5px] font-bold text-[#1C1917] w-[150px] shrink-0">{r.serialNo}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] text-[#5A6B82] truncate">{r.productType ?? '—'}</div>
                              <div className="text-[11.5px] text-[#96A2B5] truncate">{r.jobCode ?? '—'}{r.hospitalName ? ` · ${r.hospitalName}` : ''}</div>
                            </div>
                            {r.isThisJob && <span className="text-[10.5px] font-bold text-[#157F4C] bg-[#E1F3E9] rounded px-1.5 py-0.5 shrink-0">งานนี้</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>, document.body)}

      {/* add BMS unit */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-1">เพิ่มเครื่อง (S/N BMS)</div>
        <p className="text-[12.5px] text-[#8492A6] mb-3">แต่ละ S/N BMS = 1 เครื่อง · เพิ่มเลขแล้วจึงลง Serial อุปกรณ์ของเครื่องนั้น</p>
        <div className="max-w-md">
          <div className="flex gap-2">
            <input value={inputs['newbms'] ?? ''} onChange={e => setInput('newbms', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBms() } }}
              placeholder="S/N BMS เช่น BMS-KI69-001" className={inputCls} />
            <button type="button" disabled={saving['newbms']} onClick={addBms}
              className="bg-[var(--brand)] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
              {saving['newbms'] ? '…' : 'เพิ่มเครื่อง'}
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-4 flex-wrap">
            {bmsCode && (
              <button type="button" onClick={generateBms} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand)] hover:underline">
                ⚙ ออกเลขอัตโนมัติ
              </button>
            )}
            <button type="button" onClick={openBmsList} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3C4A5E] hover:text-[var(--brand)] hover:underline">
              🔎 ดูเลข S/N BMS ที่มีแล้ว
            </button>
          </div>
          {errors['newbms'] && <p className="text-xs text-[#C13540] mt-1">{errors['newbms']}</p>}
        </div>

        <div className="mt-4 pt-4 border-t border-[#EEF2F8] flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-[#5A6B82]">
            จำนวนตามข้อมูลงาน: <span className="font-bold text-[#1C1917]">{quantity}</span> · เพิ่มแล้ว <span className="font-bold text-[#1C1917]">{units.length}</span> เครื่อง
          </span>
          {quantity - units.length > 0 && (
            <button type="button" onClick={fillUnits} disabled={filling}
              className="ds-hover bg-[var(--brand-soft)] text-[var(--brand)] text-[13px] font-semibold rounded-lg px-3.5 py-1.5 hover:bg-[#FBD3B4] disabled:opacity-60">
              {filling ? 'กำลังสร้าง…' : `＋ สร้างเครื่องตามจำนวน (อีก ${quantity - units.length})`}
            </button>
          )}
          {quantity - units.length === 0 && units.length > 0 && (
            <span className="text-[13px] font-semibold text-[#157F4C]">ครบตามจำนวนแล้ว ✓</span>
          )}
        </div>
        {fillErr && <p className="text-xs text-[#C13540] mt-2">{fillErr}</p>}
      </div>

      {units.length === 0 && (
        <div className="text-center text-[#8492A6] text-sm py-4">ยังไม่มีเครื่อง — เพิ่ม S/N BMS ด้านบนก่อน</div>
      )}

      {/* per-unit component serials */}
      {units.map((unit, idx) => {
        const kids = rows.filter(s => s.parentId === unit.id)
        const dedN = kids.filter(s => stockOf(s.serialNo) === 'DEDUCTED').length
        const missN = kids.filter(s => stockOf(s.serialNo) === 'NONE').length
        const inStockKids = kids.filter(s => stockOf(s.serialNo) === 'IN_STOCK')
        return (
        <div key={unit.id} className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] grid place-items-center font-bold text-sm">{idx + 1}</span>
              {editUnit === unit.id ? (
                <span className="flex items-center gap-1.5">
                  <input value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus disabled={renaming}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(unit); if (e.key === 'Escape') setEditUnit(null) }}
                    className="text-[15px] font-bold tnum border border-[#D6DFEA] rounded-lg px-2.5 py-1 outline-none focus:border-[var(--brand)] w-[220px]" />
                  <button type="button" onClick={() => saveRename(unit)} disabled={renaming}
                    className="text-[12px] font-semibold text-white bg-[var(--brand)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">{renaming ? '…' : 'บันทึก'}</button>
                  <button type="button" onClick={() => setEditUnit(null)} disabled={renaming} className="text-[12px] text-[#8492A6] hover:text-[#3C4A5E] px-1">ยกเลิก</button>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold tnum">{unit.serialNo}</span>
                  <button type="button" onClick={() => { setEditUnit(unit.id); setEditVal(unit.serialNo) }}
                    title="แก้ไขเลข S/N BMS" className="text-[#8492A6] hover:text-[var(--brand)] text-[13px]">✎</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {kids.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold"
                  style={missN > 0 ? { background: '#FBEBCB', color: '#B45309' } : { background: '#E2F3EA', color: '#157F4C' }}>
                  {missN > 0 ? `⚠ ตัดสต็อกได้ ${dedN}/${kids.length} · ไม่มีในคลัง ${missN}` : `✓ ตัดสต็อกครบ ${dedN}/${kids.length}`}
                </span>
              )}
              {inStockKids.length > 0 && (
                <button type="button" onClick={() => inStockKids.forEach(s => deduct(s.id, s.serialNo))}
                  className="bg-[var(--brand)] text-white text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[var(--brand-strong)]">
                  ＋ ตัดสต็อกที่เหลือ ({inStockKids.length})
                </button>
              )}
              <button type="button" onClick={() => removeSerial(unit.id)} className="text-[13px] text-[#C13540] hover:underline">ลบเครื่องนี้</button>
            </div>
          </div>

          {serialComps.length === 0 ? (
            <div className="text-sm text-[#8492A6]">ยังไม่ได้กำหนดอุปกรณ์ของสินค้านี้ — ตั้งค่า › ประเภทสินค้า</div>
          ) : (
            <>
            <div className="text-[12px] text-[#8492A6] mb-3">📦 เลือกอุปกรณ์จากคลังเท่านั้น — เมื่อเลือกแล้วระบบจะตัดออกจากคลัง (จ่ายออก) ให้อัตโนมัติ</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              {serialComps.map(c => {
                const key = `u:${unit.id}:${c.name}`
                const list = rows.filter(s => s.parentId === unit.id && s.label === c.name)
                return (
                  <div key={c.name}>
                    <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">
                      {c.name} {c.quantity > 1 && <span className="text-[#8492A6] font-normal">×{c.quantity}</span>}
                    </label>
                    {list.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {list.map(s => {
                          const st = stockOf(s.serialNo)
                          const b = STOCK_BADGE[st]
                          return (
                          <span key={s.id} className="inline-flex items-center gap-1.5 bg-white border border-[#ECE8E3] rounded-lg pl-2.5 pr-1 py-1 text-[12.5px]">
                            <span className="break-all font-medium text-[#1C1917] tnum">{s.serialNo}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                            {st === 'IN_STOCK' && (
                              <button type="button" disabled={deducting[s.id]} onClick={() => deduct(s.id, s.serialNo)}
                                className="px-2 py-0.5 rounded text-[10.5px] font-bold whitespace-nowrap bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
                                {deducting[s.id] ? '…' : 'ตัดสต็อก'}
                              </button>
                            )}
                            <button type="button" onClick={() => removeSerial(s.id)} aria-label="ลบ"
                              className="w-5 h-5 grid place-items-center rounded text-[#7C8AA0] hover:text-[#C13540] hover:bg-[#FBE4E4] text-xs">✕</button>
                          </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <Combobox
                          key={`${key}-${list.length}`}
                          value=""
                          options={stockCombo}
                          onChange={(sid) => { if (sid) issueComponent(unit.id, c.name, sid) }}
                          placeholder={stockCombo.length ? 'เลือกจากคลัง (ค้นหา Serial / รุ่น)…' : 'ไม่มีของในคลัง'}
                        />
                      </div>
                      <ScanButton
                        className="shrink-0 w-11 h-[42px] grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        onScan={(code) => handleScan(unit.id, c.name, code)} />
                    </div>
                    {saving[key] && <p className="text-xs text-[#8492A6] mt-1">กำลังจ่ายออกจากคลัง…</p>}
                    {errors[key] && <p className="text-xs text-[#C13540] mt-1">{errors[key]}</p>}
                  </div>
                )
              })}
            </div>
            </>
          )}
        </div>
        )
      })}

      {/* info components + legacy serials */}
      {(infoComps.length > 0 || legacy.length > 0) && (
        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5 flex flex-col gap-4">
          {infoComps.length > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#8492A6] mb-2">อุปกรณ์ในชุด (ไม่เก็บ Serial)</div>
              <div className="flex flex-wrap gap-2">
                {infoComps.map(c => (
                  <span key={c.name} className="inline-block bg-[#F4F7FB] text-[#5A6B82] rounded-lg px-2.5 py-1 text-[12.5px]">
                    {c.name}{c.quantity > 1 ? ` ×${c.quantity}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {legacy.length > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#8492A6] mb-2">Serial ที่ยังไม่จับคู่เครื่อง (ข้อมูลเดิม)</div>
              <div className="flex flex-wrap gap-2">
                {legacy.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 bg-[#F4F7FB] text-[#3C4A5E] rounded-lg pl-2.5 pr-1 py-1 text-[12.5px]">
                    <span className="break-all">{legacyLabel(s)}: {s.serialNo}</span>
                    <button type="button" onClick={() => removeSerial(s.id)} aria-label="ลบ"
                      className="w-5 h-5 grid place-items-center rounded text-[#7C8AA0] hover:text-[#C13540] hover:bg-white text-xs">✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* recorder + status */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">ผู้บันทึก &amp; สถานะ</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">เจ้าหน้าที่ผู้บันทึก</label>
            <select value={staffId} onChange={e => { setStaffId(e.target.value); setRecSaved(false) }}
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
              <option value="">— ไม่ระบุ —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สถานะ</label>
            <select value={recStatus} onChange={e => { setRecStatus(e.target.value as SerialStatus); setRecSaved(false) }}
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
              {REC_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {recStatus === 'DONE' && (
          <div className="mt-3 rounded-lg bg-[#E4EEFF] text-[#1B5FD9] text-[13px] px-4 py-2.5">
            📅 วางแผนตรวจ QC: <span className="font-bold">
              {planFmt.format(record?.status === 'DONE' && record.qcPlannedDate ? new Date(record.qcPlannedDate) : addBusinessDays(new Date(), 3))}
            </span>
            <span className="text-[#5A6B82]"> · ภายใน 3 วันทำการ (ไม่รวมเสาร์-อาทิตย์)</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button type="button" disabled={recSaving} onClick={saveRecord}
            className="bg-[var(--brand)] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {recSaving ? 'กำลังบันทึก…' : 'บันทึกการลง Serial'}
          </button>
          {recSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>
    </div>
  )
}

// Asks which product a serial should be deducted from, narrowing กลุ่มสินค้า → รุ่น the
// same way the loan form does. Factory serials repeat across models, so this is the only
// point where the ambiguity can be resolved correctly — by the person holding the device.
function DeductPicker({ serialNo, candidates, busy, onCancel, onPick }: {
  serialNo: string; candidates: Candidate[]; busy: boolean; onCancel: () => void; onPick: (stockItemId: string) => void
}) {
  // The same factory serial exists in several products, so list them all and let the
  // user pick the right one directly — they're already separated by รุ่น/Lot, no need
  // to drill through group → product dropdowns first.
  const sorted = [...candidates].sort((a, b) =>
    a.group.localeCompare(b.group, 'th') || a.product.localeCompare(b.product, 'th') || a.lotCode.localeCompare(b.lotCode, 'th'))

  return (
    <div className="bg-white border-2 border-[var(--brand)] rounded-2xl p-5 shadow-[0_12px_40px_-16px_rgba(234,88,12,0.5)]">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="text-[15px] font-bold text-[#1C1917]">เลือกรายการที่จะตัดสต็อก</div>
        <button type="button" onClick={onCancel} className="w-7 h-7 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
      </div>
      <p className="text-[12.5px] text-[#8492A6] mb-4">
        เลข <span className="tnum font-bold text-[#1C1917]">{serialNo}</span> มีอยู่ใน {candidates.length} รุ่น
        — เลือกรุ่นที่จะตัดสต็อกได้เลย
      </p>

      <div className="flex flex-col gap-2">
        {sorted.map((c) => (
          <button key={c.stockItemId} type="button" disabled={busy} onClick={() => onPick(c.stockItemId)}
            className="flex items-center justify-between gap-3 border border-[#E1E8F2] rounded-lg px-3.5 py-3 text-left hover:bg-[#FFF7ED] hover:border-[var(--brand)] disabled:opacity-60 transition">
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[#1C1917] truncate">{c.product}</span>
              <span className="block text-[12px] text-[#8492A6] mt-0.5">
                {c.group} · Lot {c.lotCode}{c.color ? ` · ${c.color}` : ''} · คงเหลือ {c.remaining}
              </span>
            </span>
            <span className="text-[12.5px] font-bold text-white bg-[var(--brand)] rounded-lg px-3 py-1.5 shrink-0">{busy ? '…' : 'ตัดสต็อก'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
