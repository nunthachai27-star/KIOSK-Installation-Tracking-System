'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IssueStatus, IssueEventType, IssueMethod, IssueWarranty, IssueType } from '@prisma/client'
import { Combobox } from './Combobox'
import {
  ISSUE_STATUS, ISSUE_STATUS_ORDER, ISSUE_OPEN_STATUSES, ISSUE_EVENT,
  ISSUE_METHOD, ISSUE_WARRANTY, warrantyStateFrom,
} from '@/lib/issue'

const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : dFmt.format(d) }

type SerialOpt = { id: string; serialNo: string; hospital: string; jobCode: string; productType: string; warrantyEndDate: string | null }
type SpareOpt = { id: string; name: string; stockQty: number; sellPrice: number | null }
type UserOpt = { id: string; name: string }
type ClaimPartItem = { id: string; name: string; qty: number; unitPrice: number | null; stockDeducted: boolean }
type IssueEvt = {
  id: string; type: IssueEventType; fromStatus: IssueStatus | null; toStatus: IssueStatus | null
  note: string | null; actorName: string | null; createdAt: string
}
type Item = {
  id: string; issueType: IssueType; serialNo: string | null; hospital: string; jobCode: string | null; productType: string | null
  equipment: string | null
  title: string; solution: string | null; status: IssueStatus
  warrantyState: IssueWarranty; method: IssueMethod | null
  failedSerial: string | null; replacementSerial: string | null; cost: number | null
  rating: number | null; assignedToId: string | null; assignedToName: string | null
  parts: ClaimPartItem[]
  reporter: string | null; createdAt: string; updatedAt: string; eventCount: number
}
type ClaimStats = { total: number; received: number; inProgress: number; done: number }
type PatchBody = {
  status?: IssueStatus; solution?: string | null; warrantyState?: IssueWarranty
  method?: IssueMethod | null; failedSerial?: string | null; replacementSerial?: string | null; cost?: number | null
  assignedToId?: string | null
}

const dtFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? '' : dtFmt.format(d) }
const baht = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

function eventTitle(e: IssueEvt): string {
  if (e.type === 'STATUS_CHANGED') {
    const from = e.fromStatus ? ISSUE_STATUS[e.fromStatus].label : '—'
    const to = e.toStatus ? ISSUE_STATUS[e.toStatus].label : '—'
    return `เปลี่ยนสถานะ: ${from} → ${to}`
  }
  return ISSUE_EVENT[e.type].label
}

function WarrantyBadge({ w }: { w: IssueWarranty }) {
  const m = ISSUE_WARRANTY[w]
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold" style={{ background: m.bg, color: m.color }}>🛡️ {m.label}</span>
}

// A bordered stat-card used as a status filter — count on top (status colour), label below.
function StatusCard({ active, label, n, color, onClick }: { active: boolean; label: string; n: number; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left min-w-[96px] transition-colors ${active ? '' : 'bg-white hover:bg-[#FBFAF8]'}`}
      style={active ? { borderColor: color, background: `${color}12` } : { borderColor: '#ECE8E3' }}>
      <div className="text-[17px] font-bold tnum leading-none" style={{ color }}>{n}</div>
      <div className="text-[11px] font-medium text-[#5A6B82] mt-1 leading-tight">{label}</div>
    </button>
  )
}

export function IssueManager({ serials, initial, productTypes, productTypeOptions, equipmentByProduct, spareParts, users, stats }: { serials: SerialOpt[]; initial: Item[]; productTypes: string[]; productTypeOptions: string[]; equipmentByProduct: Record<string, string[]>; spareParts: SpareOpt[]; users: UserOpt[]; stats: ClaimStats }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  // Keep in sync with the server after router.refresh() so the timeline/claim data reflect updates.
  useEffect(() => { setItems(initial) }, [initial])
  const [issueType, setIssueType] = useState<IssueType>('CLAIM')
  const [prodType, setProdType] = useState('') // ประเภทสินค้า (เลือกจากตั้งค่า)
  const [equipment, setEquipment] = useState('') // รายการอุปกรณ์ (เลือกจากตั้งค่า)
  const [serialId, setSerialId] = useState('')
  const [manualSerialText, setManualSerialText] = useState('')
  const [manualHospital, setManualHospital] = useState('')
  const [title, setTitle] = useState('')
  const [solution, setSolution] = useState('')
  const [status, setStatus] = useState<IssueStatus>('RECEIVED')
  const [warranty, setWarranty] = useState<IssueWarranty>('UNKNOWN')
  const [method, setMethod] = useState<IssueMethod | ''>('')
  const [failedSerial, setFailedSerial] = useState('')
  const [replacementSerial, setReplacementSerial] = useState('')
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<IssueStatus | 'ALL' | 'OPEN'>('ALL')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'ALL'>('ALL')
  const [productFilter, setProductFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [formOpen, setFormOpen] = useState(false) // การแจ้งเคลม/ปัญหา อยู่ในป็อปอัพ กดปุ่มจึงเปิด
  const [detailId, setDetailId] = useState<string | null>(null) // แถวที่กดเปิดดูรายละเอียด (ป็อปอัพ)
  const [limit, setLimit] = useState(20) // แสดงล่าสุด 20 รายการ — ที่เหลือค้นหาเอา
  const isClaim = issueType === 'CLAIM'

  function resetForm() {
    setProdType(''); setEquipment(''); setSerialId(''); setManualSerialText(''); setManualHospital('')
    setTitle(''); setSolution(''); setStatus('RECEIVED'); setWarranty('UNKNOWN')
    setMethod(''); setFailedSerial(''); setReplacementSerial(''); setCost(''); setErr('')
  }

  const comboOpts = serials.map((s) => ({ id: s.id, label: s.serialNo, sub: `${s.hospital} · ${s.jobCode}` }))
  const selectedSerial = serials.find((s) => s.id === serialId)

  function onPickSerial(id: string) {
    setSerialId(id)
    const s = serials.find((x) => x.id === id)
    setWarranty(s ? warrantyStateFrom(s.warrantyEndDate) : 'UNKNOWN')
    // Fill the separate fields + product type from the picked unit (still editable).
    if (s) { setManualSerialText(s.serialNo); setManualHospital(s.hospital); if (s.productType) setProdType(s.productType) }
  }

  async function add() {
    const usePicked = isClaim && !!serialId
    if (isClaim && !serialId && !manualSerialText.trim() && !manualHospital.trim()) { setErr('ระบุโรงพยาบาลหรือ S/N BMS'); return }
    if (!title.trim()) { setErr('ระบุอาการ/รายละเอียดปัญหา'); return }
    setSaving(true); setErr('')
    try {
      const body = usePicked
        ? { issueType, productType: prodType || null, equipment: isClaim ? (equipment || null) : null, serialId, title, solution, status, warrantyState: warranty, method: method || null, failedSerial, replacementSerial, cost }
        : { issueType, productType: prodType || null, equipment: isClaim ? (equipment || null) : null, machineSerial: isClaim ? manualSerialText : null, hospitalName: manualHospital, title, solution, status,
            warrantyState: isClaim ? warranty : 'UNKNOWN', method: isClaim ? (method || null) : null,
            failedSerial: isClaim ? failedSerial : null, replacementSerial: isClaim ? replacementSerial : null, cost: isClaim ? cost : null }
      const res = await fetch('/api/issues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
      const s = usePicked ? serials.find((x) => x.id === serialId) : undefined
      setItems((x) => [{
        id: crypto.randomUUID(), issueType,
        serialNo: usePicked ? s!.serialNo : (isClaim ? manualSerialText.trim() || null : null),
        hospital: usePicked ? s!.hospital : (manualHospital.trim() || '—'),
        jobCode: usePicked ? s!.jobCode : null, productType: prodType || (usePicked ? s!.productType : null),
        equipment: isClaim ? (equipment || null) : null,
        title: title.trim(), solution: solution.trim() || null, status,
        warrantyState: isClaim ? warranty : 'UNKNOWN', method: isClaim ? (method || null) : null,
        failedSerial: isClaim ? (failedSerial.trim() || null) : null, replacementSerial: isClaim ? (replacementSerial.trim() || null) : null,
        cost: isClaim && cost && !isNaN(Number(cost)) ? Number(cost) : null,
        rating: null, assignedToId: null, assignedToName: null, parts: [],
        reporter: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), eventCount: 0,
      }, ...x])
      resetForm()
      setFormOpen(false)
      router.refresh()
    } finally { setSaving(false) }
  }

  async function patch(id: string, body: PatchBody) {
    const res = await fetch(`/api/issues/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      setItems((x) => x.map((it) => (it.id === id ? { ...it, ...body } : it)))
      router.refresh()
    }
  }

  async function remove(id: string) {
    if (!window.confirm('ลบรายการเคลมนี้?')) return
    const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  async function addPart(issueId: string, body: { stockProductId: string; qty: number; deductStock: boolean }) {
    const res = await fetch(`/api/issues/${issueId}/parts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const p = await res.json() as ClaimPartItem
      setItems((x) => x.map((it) => (it.id === issueId ? { ...it, parts: [...it.parts, p] } : it)))
      router.refresh()
    }
  }

  async function removePart(issueId: string, partId: string) {
    const res = await fetch(`/api/issues/${issueId}/parts/${partId}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((x) => x.map((it) => (it.id === issueId ? { ...it, parts: it.parts.filter((p) => p.id !== partId) } : it)))
      router.refresh()
    }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'
  const byProduct = productFilter
    ? items.filter((i) => (productFilter === '__NONE__' ? !i.productType : i.productType === productFilter))
    : items
  const byType = typeFilter === 'ALL' ? byProduct : byProduct.filter((i) => i.issueType === typeFilter)
  const byStatus = filter === 'ALL' ? byType
    : filter === 'OPEN' ? byType.filter((i) => (ISSUE_OPEN_STATUSES as IssueStatus[]).includes(i.status))
    : byType.filter((i) => i.status === filter)
  const sq = search.trim().toLowerCase()
  const bySearch = sq
    ? byStatus.filter((i) => [i.serialNo, i.hospital, i.title, i.jobCode, i.failedSerial, i.replacementSerial]
        .some((v) => (v ?? '').toLowerCase().includes(sq)))
    : byStatus
  // Date-range filter (by แจ้ง/created date). `to` is inclusive of the whole day.
  const fromT = dateFrom ? new Date(dateFrom).getTime() : null
  const toT = dateTo ? new Date(dateTo).getTime() + 86400000 - 1 : null
  const shown = (fromT || toT)
    ? bySearch.filter((i) => { const t = new Date(i.createdAt).getTime(); return (!fromT || t >= fromT) && (!toT || t <= toT) })
    : bySearch
  // Reset the render cap whenever the visible set changes (new filter/search).
  useEffect(() => { setLimit(20) }, [filter, typeFilter, productFilter, search, dateFrom, dateTo])
  // Newest report first, always.
  const sorted = [...shown].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const visible = sorted.slice(0, limit)
  const detailItem = detailId ? items.find((i) => i.id === detailId) ?? null : null
  const openCount = byType.filter((i) => (ISSUE_OPEN_STATUSES as IssueStatus[]).includes(i.status)).length
  // Only surface status chips that actually have records, to keep the filter compact.
  const statusChips = ISSUE_STATUS_ORDER.map((st) => ({ st, n: byType.filter((i) => i.status === st).length })).filter((c) => c.n > 0)
  const claimCount = byProduct.filter((i) => i.issueType === 'CLAIM').length
  const generalCount = byProduct.filter((i) => i.issueType === 'GENERAL').length
  const noProductCount = items.filter((i) => !i.productType).length

  // Repeat-failure count per equipment: how many reports share the same S/N.
  // Keyed by the (trimmed) serial string; skip junk keys so a stray "." isn't grouped.
  const serialKey = (sn: string | null) => { const k = (sn ?? '').trim(); return k.length >= 4 && /[A-Za-z0-9]/.test(k) ? k : null }
  const repeatBySerial = new Map<string, number>()
  for (const it of items) { const k = serialKey(it.serialNo); if (k) repeatBySerial.set(k, (repeatBySerial.get(k) ?? 0) + 1) }
  const repeatOf = (it: Item) => { const k = serialKey(it.serialNo); return k ? (repeatBySerial.get(k) ?? 1) : 1 }

  return (
    <div className="flex flex-col gap-4">
      {/* CTA bar — เปิดฟอร์มแจ้งเคลม/ปัญหา ในป็อปอัพ (เต็มความกว้าง) */}
      <div className="ds-card px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[15px] font-bold text-[#1C1917]">แจ้งเคลม / ปัญหาใหม่</div>
          <p className="text-[12.5px] text-[#8492A6] mt-0.5">กดปุ่มเพื่อเปิดฟอร์มบันทึก</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => { setIssueType('CLAIM'); setErr(''); setFormOpen(true) }}
            className="ds-hover bg-[#EA580C] text-white font-semibold rounded-lg px-4 py-2.5 hover:bg-[#C2410C]">🔧 ＋ แจ้งเคลมอุปกรณ์</button>
          <button type="button" onClick={() => { setIssueType('GENERAL'); setErr(''); setFormOpen(true) }}
            className="ds-hover bg-[#1B5FD9] text-white font-semibold rounded-lg px-4 py-2.5 hover:bg-[#164FB3]">📝 ＋ แจ้งปัญหาทั่วไป</button>
        </div>
      </div>

      {/* content: รายการ (ซ้าย) + ข้อมูลช่วยเหลือ (ขวา) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_324px] gap-4 items-start">
      <div className="flex flex-col gap-4 min-w-0">

      {/* form modal — fixed จึงไม่กิน grid track (layout เดิมไม่กระทบ) */}
      {formOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) setFormOpen(false) }}>
      <div className="mx-auto my-4 w-full max-w-2xl ds-card p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-[#1C1917]">บันทึกแจ้งเคลม / ปัญหา</div>
          <button type="button" onClick={() => setFormOpen(false)} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        {/* type toggle: equipment claim vs general problem */}
        <div className="inline-flex rounded-lg border border-[#D6DFEA] overflow-hidden mb-4">
          <button type="button" onClick={() => setIssueType('CLAIM')}
            className={`px-4 py-2 text-[13px] font-semibold ${isClaim ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>
            🔧 แจ้งเคลมอุปกรณ์
          </button>
          <button type="button" onClick={() => setIssueType('GENERAL')}
            className={`px-4 py-2 text-[13px] font-semibold ${!isClaim ? 'bg-[#1B5FD9] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>
            📝 แจ้งปัญหาทั่วไป
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className={isClaim ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ประเภทสินค้า</label>
              <select value={prodType} onChange={(e) => setProdType(e.target.value)} className={field}>
                <option value="">— เลือกประเภทสินค้า —</option>
                {[...new Set([...productTypeOptions, ...(prodType ? [prodType] : [])])].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {isClaim && (
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รายการอุปกรณ์</label>
                <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={field} disabled={!prodType}>
                  <option value="">{prodType ? '— เลือกรายการอุปกรณ์ —' : '— เลือกประเภทสินค้าก่อน —'}</option>
                  {[...new Set([...(equipmentByProduct[prodType] ?? []), ...(equipment ? [equipment] : [])])].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>
          {isClaim ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">โรงพยาบาล</label>
                  <input value={manualHospital} onChange={(e) => { setManualHospital(e.target.value); setSerialId('') }} placeholder="ชื่อโรงพยาบาล" className={field} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">S/N BMS (ตู้/เครื่อง)</label>
                  <input value={manualSerialText} onChange={(e) => { setManualSerialText(e.target.value); setSerialId('') }} placeholder="พิมพ์ S/N BMS / เลขเครื่อง" className={`${field} tnum`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ดึงจากระบบ <span className="font-normal text-[#8492A6]">(ถ้ามีในระบบ — เลือกเพื่อเติมอัตโนมัติ + ตรวจสิทธิประกัน)</span></label>
                <Combobox value={serialId} onChange={onPickSerial} options={comboOpts} placeholder="ค้นหา S/N BMS หรือชื่อโรงพยาบาลในระบบ…" />
                {selectedSerial && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[12.5px] text-[#5A6B82]">
                    <span>{selectedSerial.productType}</span>
                    <WarrantyBadge w={warrantyStateFrom(selectedSerial.warrantyEndDate)} />
                    <span className="text-[#A8A29E]">(อัตโนมัติจากวันเปิดบิล +1 ปี)</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่อโรงพยาบาล / หน่วยงาน (ถ้ามี)</label>
              <input value={manualHospital} onChange={(e) => setManualHospital(e.target.value)} placeholder="เว้นว่างได้ถ้าเป็นปัญหาภายใน" className={field} />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">{isClaim ? 'อาการเสีย / ชื่อปัญหา' : 'รายละเอียดปัญหา'}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isClaim ? 'เช่น จอไม่ติด, Smartcard ใช้ไม่ได้' : 'เช่น ระบบล่ม, ขอคำแนะนำการใช้งาน'} className={field} />
          </div>

          {isClaim && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">การรับประกัน</label>
                  <select value={warranty} onChange={(e) => setWarranty(e.target.value as IssueWarranty)} className={field}>
                    {(Object.keys(ISSUE_WARRANTY) as IssueWarranty[]).map((w) => <option key={w} value={w}>{ISSUE_WARRANTY[w].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">Serial อุปกรณ์ที่เสีย</label>
                  <input value={failedSerial} onChange={(e) => setFailedSerial(e.target.value)} placeholder="Serial ชิ้นที่พัง" className={`${field} tnum`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">Serial ที่ส่งเปลี่ยนให้ลูกค้า</label>
                  <input value={replacementSerial} onChange={(e) => setReplacementSerial(e.target.value)} placeholder="Serial ชิ้นทดแทน" className={`${field} tnum`} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ค่าใช้จ่าย (บาท)</label>
                  <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="กรณีนอกประกัน" className={`${field} tnum`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วิธีดำเนินการ</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as IssueMethod | '')} className={field}>
                    <option value="">— ไม่ระบุ —</option>
                    {(Object.keys(ISSUE_METHOD) as IssueMethod[]).map((m) => <option key={m} value={m}>{ISSUE_METHOD[m]}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วิธีการแก้ไข (ถ้ามี)</label>
            <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} placeholder="บันทึกวิธีแก้ไข…" className={field} />
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สถานะ</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)} className={`${field} w-56`}>
                {ISSUE_STATUS_ORDER.map((st) => <option key={st} value={st}>{ISSUE_STATUS[st].label}</option>)}
              </select>
            </div>
            <button type="button" onClick={resetForm}
              className="ml-auto border border-[#D6DFEA] text-[#5A6B82] font-semibold rounded-lg px-4 py-2.5 hover:bg-[#F4F3F1] flex items-center gap-1.5">
              ⟳ รีเซ็ต
            </button>
            <button onClick={add} disabled={saving}
              className={`ds-hover text-white font-semibold rounded-lg px-5 py-2.5 disabled:opacity-60 flex items-center gap-1.5 ${isClaim ? 'bg-[#EA580C] hover:bg-[#C2410C]' : 'bg-[#1B5FD9] hover:bg-[#164FB3]'}`}>
              {saving ? 'กำลังบันทึก…' : (isClaim ? '🗎 บันทึกเคลม' : '🗎 บันทึกปัญหา')}
            </button>
            {err && <span className="w-full text-sm text-[#C13540]">{err}</span>}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* type filter + product-type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {([['ALL', `ทั้งหมด (${byProduct.length})`], ['CLAIM', `🔧 เคลมอุปกรณ์ (${claimCount})`], ['GENERAL', `📝 ปัญหาทั่วไป (${generalCount})`]] as const).map(([v, label]) => (
          <button key={v} onClick={() => { setTypeFilter(v); setFilter('ALL') }}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border ${typeFilter === v ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {label}
          </button>
        ))}
        <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setFilter('ALL') }}
          className="ml-auto border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] bg-white outline-none focus:border-[#EA580C]"
          aria-label="กรองตามประเภทสินค้า">
          <option value="">ทุกประเภทสินค้า</option>
          {productTypes.map((p) => <option key={p} value={p}>{p}</option>)}
          {noProductCount > 0 && <option value="__NONE__">— ไม่ระบุประเภท ({noProductCount}) —</option>}
        </select>
      </div>

      {/* search + filter toggle + date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา S/N BMS, โรงพยาบาล, อาการ/ปัญหา…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]">🔍</span>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 border rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${showFilters ? 'border-[#EA580C] text-[#EA580C] bg-[#FFF7F2]' : 'border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>
          ⛃ ตัวกรอง
        </button>
        <div className="flex items-center gap-1.5 border border-[#D6DFEA] rounded-lg px-2.5 py-1.5">
          <span className="text-[#A8A29E] text-[13px]">🗓</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="ตั้งแต่วันที่"
            className="text-[12.5px] tnum text-[#3C4A5E] outline-none bg-transparent w-[112px]" />
          <span className="text-[#C4BFB9]">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="ถึงวันที่"
            className="text-[12.5px] tnum text-[#3C4A5E] outline-none bg-transparent w-[112px]" />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-[#A8A29E] hover:text-[#C13540] text-[13px]">✕</button>}
        </div>
      </div>

      {/* status filter cards */}
      {showFilters && (
        <div className="flex items-stretch gap-2 flex-wrap">
          <StatusCard active={filter === 'ALL'} label="ทั้งหมด" n={byProduct.length} color="#EA580C" onClick={() => setFilter('ALL')} />
          <StatusCard active={filter === 'OPEN'} label="กำลังดำเนินการ" n={openCount} color="#1B5FD9" onClick={() => setFilter('OPEN')} />
          {statusChips.map(({ st, n }) => (
            <StatusCard key={st} active={filter === st} label={ISSUE_STATUS[st].label} n={n} color={ISSUE_STATUS[st].color} onClick={() => setFilter(st)} />
          ))}
        </div>
      )}

      {/* list — compact rows; click a row to open full detail/edit in a popup */}
      <div className="flex flex-col gap-2">
        <div className="text-[12.5px] text-[#8492A6]">
          {sq
            ? `พบ ${sorted.length} รายการที่ตรงกับ “${search.trim()}”`
            : `ทั้งหมด ${byProduct.length} รายการ · แสดงล่าสุด ${Math.min(limit, sorted.length)} · พิมพ์ค้นหาเพื่อดูรายการอื่น`}
        </div>
        {sorted.length === 0 && <div className="ds-card p-6 text-sm text-[#8492A6]">{sq ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการ'}</div>}
        {visible.map((it) => <IssueRow key={it.id} item={it} onOpen={() => setDetailId(it.id)} />)}
        {sorted.length > limit && (
          <button onClick={() => setLimit((n) => n + 20)}
            className="ds-card p-3 text-[13px] font-semibold text-[#EA580C] hover:bg-[#FFF7F2] text-center">
            แสดงเพิ่มอีก 20 · เหลืออีก {sorted.length - limit} รายการ (แนะนำใช้ช่องค้นหา)
          </button>
        )}
      </div>

      {/* detail / edit popup */}
      {detailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDetailId(null) }}>
          <div className="mx-auto my-4 w-full max-w-2xl">
            <div className="flex items-center justify-between bg-white rounded-t-2xl px-4 py-3 border-b border-[#F1F3F6] shadow-[0_-1px_0_#E7EDF4]">
              <div className="font-bold text-[15px] text-[#1C1917]">รายละเอียดเคลม / แก้ไข</div>
              <button type="button" onClick={() => setDetailId(null)} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
            </div>
            <IssueCard item={detailItem} spareParts={spareParts} users={users} repeatCount={repeatOf(detailItem)}
              onShowHistory={() => { setSearch(detailItem.serialNo ?? ''); setDetailId(null) }}
              onPatch={(b) => patch(detailItem.id, b)} onDelete={() => { remove(detailItem.id); setDetailId(null) }}
              onAddPart={(b) => addPart(detailItem.id, b)} onRemovePart={(pid) => removePart(detailItem.id, pid)} />
          </div>
        </div>
      )}
      </div>

      {/* helper sidebar — warranty rule, 30-day claim activity, workflow steps (คอลัมน์ขวา) */}
      <aside className="ds-card p-5 flex flex-col gap-5 lg:sticky lg:top-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F6]">
          <span className="w-8 h-8 rounded-lg bg-[#FFEDE1] text-[#EA580C] grid place-items-center">🛟</span>
          <span className="font-bold text-[15px] text-[#1C1917]">ข้อมูลช่วยเหลือ</span>
        </div>

        <div className="flex gap-2.5">
          <span className="text-[#157F4C] text-[17px] leading-none mt-0.5">🛡️</span>
          <div>
            <div className="text-[13px] font-bold text-[#1C1917]">สิทธิประกัน</div>
            <div className="text-[12px] text-[#8492A6] mt-0.5 leading-relaxed">ระบบตรวจสอบสิทธิประกันอัตโนมัติจากวันที่เปิดบิล (+1 ปี)</div>
          </div>
        </div>

        <div>
          <div className="text-[12.5px] font-bold text-[#57534E] mb-2">📊 สถิติการแจ้งเคลม <span className="text-[#A8A29E] font-medium">(30 วันล่าสุด)</span></div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'แจ้งทั้งหมด', value: stats.total, color: '#1C1917' },
              { label: 'รออนุมัติ', value: stats.received, color: '#B45309' },
              { label: 'กำลังดำเนินการ', value: stats.inProgress, color: '#1B5FD9' },
              { label: 'ปิดงานแล้ว', value: stats.done, color: '#157F4C' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] px-3 py-2.5">
                <div className="text-[20px] font-bold tnum leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-[#8492A6] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[12.5px] font-bold text-[#57534E] mb-2">🧭 ขั้นตอนการทำงาน</div>
          <ol className="flex flex-col gap-2.5">
            {['กรอกข้อมูลและบันทึกเคลม', 'รอเจ้าหน้าที่ตรวจสอบ/อนุมัติ', 'ดำเนินการและปิดงาน'].map((t, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-[#EA580C] text-white grid place-items-center text-[11px] font-bold tnum">{i + 1}</span>
                <span className="text-[12.5px] text-[#3C4A5E]">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
      </div>
    </div>
  )
}

// Compact list row — hospital first, then S/N + report date; opens the detail popup.
function IssueRow({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const meta = ISSUE_STATUS[item.status]
  return (
    <button type="button" onClick={onOpen}
      className="ds-card px-4 py-3 w-full text-left hover:bg-[#FBFAF8] flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-bold text-[#1C1917] truncate">{item.hospital || '—'}</span>
          {item.serialNo && <span className="tnum text-[12px] text-[#5A6B82]">S/N {item.serialNo}</span>}
          <span className="text-[11.5px] text-[#A8A29E]">· {fmtDate(item.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[11px]">{item.issueType === 'CLAIM' ? '🔧' : '📝'}</span>
          {item.equipment && <span className="px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-[#EEF3FA] text-[#1B5FD9]">{item.equipment}</span>}
          <span className="text-[12.5px] text-[#5A6B82] truncate">{item.title}</span>
        </div>
      </div>
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      <span className="text-[#C4BFB9] shrink-0">›</span>
    </button>
  )
}

function IssueCard({ item, spareParts, users, repeatCount, onShowHistory, onPatch, onDelete, onAddPart, onRemovePart }: {
  item: Item; spareParts: SpareOpt[]; users: UserOpt[]; repeatCount: number; onShowHistory: () => void
  onPatch: (b: PatchBody) => void; onDelete: () => void
  onAddPart: (b: { stockProductId: string; qty: number; deductStock: boolean }) => void
  onRemovePart: (partId: string) => void
}) {
  const [sol, setSol] = useState(item.solution ?? '')
  const [failed, setFailed] = useState(item.failedSerial ?? '')
  const [repl, setRepl] = useState(item.replacementSerial ?? '')
  const [cost, setCost] = useState(item.cost != null ? String(item.cost) : '')
  const [openTl, setOpenTl] = useState(false)
  const [events, setEvents] = useState<IssueEvt[] | null>(null)
  const [loadingTl, setLoadingTl] = useState(false)
  const [partId, setPartId] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [copied, setCopied] = useState(false)
  const meta = ISSUE_STATUS[item.status]

  // Timeline events are loaded on demand the first time the timeline is opened,
  // and refetched if the event count changed (e.g. after a status update).
  async function toggleTimeline() {
    const next = !openTl
    setOpenTl(next)
    if (next && (events === null || events.length !== item.eventCount)) {
      setLoadingTl(true)
      try {
        const r = await fetch(`/api/issues/${item.id}/events`)
        if (r.ok) setEvents(await r.json() as IssueEvt[])
      } finally { setLoadingTl(false) }
    }
  }

  function copyRateLink() {
    const url = `${window.location.origin}/rate/${item.id}`
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  const partsTotal = item.parts.reduce((s, p) => s + (p.unitPrice ?? 0) * p.qty, 0)

  const solDirty = (item.solution ?? '') !== sol
  const claimDirty = (item.failedSerial ?? '') !== failed.trim()
    || (item.replacementSerial ?? '') !== repl.trim()
    || (item.cost != null ? String(item.cost) : '') !== cost.trim()

  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.issueType === 'CLAIM'
              ? <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FFEDE1] text-[#EA580C]">🔧 เคลมอุปกรณ์</span>
              : <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#E4EEFF] text-[#1B5FD9]">📝 ปัญหาทั่วไป</span>}
            {item.serialNo && <span className="tnum text-sm font-bold text-[#1C1917]">{item.serialNo}</span>}
            <span className="text-[12.5px] text-[#8492A6]">{[item.hospital, item.jobCode, item.productType].filter(Boolean).join(' · ')}</span>
            {item.issueType === 'CLAIM' && <WarrantyBadge w={item.warrantyState} />}
            {repeatCount > 1 && (
              <button type="button" onClick={onShowHistory} title="เครื่องนี้เคยแจ้งซ้ำ — คลิกดูประวัติทั้งหมด"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FBE4E4] text-[#C13540] hover:bg-[#F7CFCF]">
                🔁 แจ้งซ้ำ {repeatCount} ครั้ง
              </button>
            )}
          </div>
          <div className="text-[15px] font-semibold text-[#1C1917] mt-1">
            {item.equipment && <span className="inline-block mr-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-bold bg-[#EEF3FA] text-[#1B5FD9] align-middle">{item.equipment}</span>}
            {item.title}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={item.status} onChange={(e) => onPatch({ status: e.target.value as IssueStatus })}
            className="border rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold outline-none"
            style={{ borderColor: meta.bg, background: meta.bg, color: meta.color }}>
            {ISSUE_STATUS_ORDER.map((st) => <option key={st} value={st}>{ISSUE_STATUS[st].label}</option>)}
          </select>
          <button onClick={onDelete} className="w-8 h-8 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
        </div>
      </div>

      {/* claim detail: warranty / method / serials / cost — claims only */}
      {item.issueType === 'CLAIM' && (<>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div>
          <label className="block text-[11.5px] font-semibold text-[#5A6B82] mb-1">การรับประกัน</label>
          <select value={item.warrantyState} onChange={(e) => onPatch({ warrantyState: e.target.value as IssueWarranty })}
            className="w-full border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-[#EA580C]">
            {(Object.keys(ISSUE_WARRANTY) as IssueWarranty[]).map((w) => <option key={w} value={w}>{ISSUE_WARRANTY[w].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#5A6B82] mb-1">วิธีดำเนินการ</label>
          <select value={item.method ?? ''} onChange={(e) => onPatch({ method: (e.target.value || null) as IssueMethod | null })}
            className="w-full border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-[#EA580C]">
            <option value="">— ไม่ระบุ —</option>
            {(Object.keys(ISSUE_METHOD) as IssueMethod[]).map((m) => <option key={m} value={m}>{ISSUE_METHOD[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#5A6B82] mb-1">Serial ที่เสีย</label>
          <input value={failed} onChange={(e) => setFailed(e.target.value)} placeholder="—"
            className="w-full border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] tnum outline-none focus:border-[#EA580C]" />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#5A6B82] mb-1">Serial ที่ส่งเปลี่ยน</label>
          <input value={repl} onChange={(e) => setRepl(e.target.value)} placeholder="—"
            className="w-full border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] tnum outline-none focus:border-[#EA580C]" />
        </div>
      </div>
      <div className="mt-2 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11.5px] font-semibold text-[#5A6B82] mb-1">ค่าใช้จ่าย (บาท)</label>
          <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="—"
            className="w-40 border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] tnum outline-none focus:border-[#EA580C]" />
        </div>
        {item.cost != null && !claimDirty && <span className="text-[12.5px] text-[#5A6B82] pb-1.5">= {baht.format(item.cost)} บาท</span>}
        {claimDirty && (
          <button onClick={() => onPatch({ failedSerial: failed.trim() || null, replacementSerial: repl.trim() || null, cost: cost.trim() && !isNaN(Number(cost)) ? Number(cost) : null })}
            className="bg-[#EA580C] text-white text-[12.5px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#C2410C]">บันทึกรายละเอียด</button>
        )}
      </div>

      {/* spare parts used on this claim */}
      <div className="mt-3 rounded-xl bg-[#FBFAF8] border border-[#EEEAE6] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[12.5px] font-bold text-[#57534E]">📦 อะไหล่ที่ใช้ ({item.parts.length})</span>
          {partsTotal > 0 && <span className="text-[12px] text-[#5A6B82]">รวมค่าอะไหล่ {baht.format(partsTotal)} บาท</span>}
        </div>
        {item.parts.length > 0 && (
          <div className="flex flex-col gap-1 mb-2">
            {item.parts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-1 truncate text-[#1C1917]">{p.name} <span className="text-[#8492A6]">× {p.qty}</span>
                  {p.stockDeducted && <span className="ml-1.5 text-[10.5px] text-[#157F4C]">ตัดสต็อกแล้ว</span>}
                  {p.unitPrice != null && <span className="ml-1.5 text-[#8492A6]">({baht.format(p.unitPrice * p.qty)} ฿)</span>}
                </span>
                <button onClick={() => onRemovePart(p.id)} className="text-[#C13540] hover:bg-[#FBE4E4] rounded px-1.5">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 flex-wrap">
          <select value={partId} onChange={(e) => setPartId(e.target.value)}
            className="flex-1 min-w-[180px] border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-[#EA580C]">
            <option value="">— เลือกอะไหล่จากคลัง —</option>
            {spareParts.map((s) => <option key={s.id} value={s.id}>{s.name} (คงเหลือ {s.stockQty})</option>)}
          </select>
          <input type="number" min={1} value={partQty} onChange={(e) => setPartQty(e.target.value)}
            className="w-16 border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] tnum outline-none focus:border-[#EA580C]" />
          <button disabled={!partId} onClick={() => { onAddPart({ stockProductId: partId, qty: Math.max(1, Number(partQty) || 1), deductStock: false }); setPartId(''); setPartQty('1') }}
            className="bg-[#EA580C] text-white text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#C2410C] disabled:opacity-50">＋ เพิ่ม</button>
        </div>
      </div>
      </>)}

      <div className="mt-3">
        <label className="block text-[12.5px] font-semibold text-[#5A6B82] mb-1">วิธีการแก้ไข</label>
        <div className="flex gap-2 items-start">
          <textarea value={sol} onChange={(e) => setSol(e.target.value)} rows={2} placeholder="บันทึกวิธีแก้ไข…"
            className="flex-1 border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#EA580C]" />
          {solDirty && (
            <button onClick={() => onPatch({ solution: sol })}
              className="bg-[#EA580C] text-white text-[13px] font-semibold rounded-lg px-3 py-2 hover:bg-[#C2410C] shrink-0">บันทึก</button>
          )}
        </div>
      </div>

      {/* responsible resolver — the satisfaction rating is attributed to this staff */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <label className="text-[12.5px] font-semibold text-[#5A6B82]">ผู้รับผิดชอบแก้ไข</label>
        <select value={item.assignedToId ?? ''} onChange={(e) => onPatch({ assignedToId: e.target.value || null })}
          className="border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-[#EA580C]">
          <option value="">— ยังไม่ระบุ —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <span className="text-[11px] text-[#A8A29E]">คะแนนความพึงพอใจจะนับให้เจ้าหน้าที่คนนี้</span>
      </div>

      {/* satisfaction rating (hospital) */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {item.rating != null ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309] bg-[#FBEBCB] rounded-lg px-2.5 py-1">
            <span className="tracking-tight">{'★'.repeat(item.rating)}<span className="text-[#E0D3B8]">{'★'.repeat(5 - item.rating)}</span></span>
            คะแนนจาก รพ. {item.rating}/5
          </span>
        ) : (
          <span className="text-[12px] text-[#8492A6]">ยังไม่มีคะแนนประเมิน</span>
        )}
        <button onClick={copyRateLink} className="text-[12px] font-semibold text-[#EA580C] hover:underline">
          {copied ? '✓ คัดลอกลิงก์แล้ว' : '🔗 คัดลอกลิงก์ให้ รพ. ประเมิน'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <div className="text-[11px] text-[#A8A29E]">
          {item.reporter ? `แจ้งโดย ${item.reporter} · ` : ''}อัปเดต {fmt(item.updatedAt)}
        </div>
        {item.eventCount > 0 && (
          <button onClick={toggleTimeline}
            className="text-[12px] font-semibold text-[#EA580C] hover:underline">
            {openTl ? '▾' : '▸'} Timeline การติดตาม ({item.eventCount})
          </button>
        )}
      </div>

      {openTl && loadingTl && !events && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-[12.5px] text-[#8492A6]">กำลังโหลด Timeline…</div>
      )}
      {openTl && events && events.length > 0 && (
        <ol className="mt-3 pt-3 border-t border-[#F1F5F9]">
          {events.map((e, idx) => {
            const ev = ISSUE_EVENT[e.type]
            const last = idx === events.length - 1
            return (
              <li key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-7 h-7 rounded-full grid place-items-center text-[13px] shrink-0"
                    style={{ background: `${ev.color}1F` }}>{ev.icon}</span>
                  {!last && <span className="w-px flex-1 bg-[#E7EDF4] my-1" />}
                </div>
                <div className={last ? '' : 'pb-4'}>
                  <div className="text-[13px] font-semibold text-[#1C1917]">{eventTitle(e)}</div>
                  {e.note && <div className="text-[12.5px] text-[#5A6B82] mt-0.5 whitespace-pre-wrap">{e.note}</div>}
                  <div className="text-[11px] text-[#A8A29E] mt-0.5">{e.actorName ? `${e.actorName} · ` : ''}{fmt(e.createdAt)}</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
