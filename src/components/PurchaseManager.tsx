'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { PurchaseStatus } from '@prisma/client'
import { PURCHASE_STATUS, PURCHASE_STATUS_ORDER, PURCHASE_STEPS } from '@/lib/purchase'

type Item = {
  id: string; itemName: string; category: string | null; quantity: number; unit: string
  vendor: string | null; price: number | null; status: PurchaseStatus; note: string | null
  neededDate: string | null; orderedDate: string | null; receivedDate: string | null
  requestedByName: string | null; createdAt: string
}
type FormBody = Partial<Omit<Item, 'id' | 'requestedByName' | 'createdAt'>>

const baht = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const nf = new Intl.NumberFormat('th-TH')
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dFmt.format(new Date(iso)) : '—')
const money = (n: number | null) => (n == null ? '—' : `${baht.format(n)} ฿`)

export function PurchaseManager({ initial, canDelete }: { initial: Item[]; canDelete: boolean }) {
  const router = useRouter()
  const [items] = useState<Item[]>(initial)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'ALL' | PurchaseStatus>('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length }
    for (const s of PURCHASE_STATUS_ORDER) c[s] = items.filter((i) => i.status === s).length
    return c
  }, [items])

  const ql = q.trim().toLowerCase()
  const shown = useMemo(() => items.filter((i) => {
    if (filter !== 'ALL' && i.status !== filter) return false
    if (!ql) return true
    return [i.itemName, i.category, i.vendor, i.note].some((v) => (v ?? '').toLowerCase().includes(ql))
  }), [items, filter, ql])

  async function patch(id: string, body: FormBody) {
    const res = await fetch(`/api/purchases/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) router.refresh()
  }
  async function remove(id: string) {
    if (!window.confirm('ลบงานจัดซื้อรายการนี้?')) return
    const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (it: Item) => { setEditing(it); setFormOpen(true) }

  const kpi = [
    { label: 'ทั้งหมด', value: counts.ALL, color: '#1C1917', bg: '#EEF3FA', icon: '🛒' },
    { label: 'ขอซื้อ/อนุมัติ', value: (counts.REQUESTED ?? 0) + (counts.APPROVED ?? 0), color: '#9A6B10', bg: '#FAF0D8', icon: '📝' },
    { label: 'สั่งซื้อ/จัดส่ง', value: (counts.ORDERED ?? 0) + (counts.SHIPPING ?? 0), color: '#1B5FD9', bg: '#E4EEFF', icon: '🚚' },
    { label: 'รับของแล้ว', value: counts.RECEIVED ?? 0, color: '#157F4C', bg: '#E2F3EA', icon: '✅' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpi.map((c) => (
          <div key={c.label} className="ds-card ds-hover px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl grid place-items-center text-[18px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#8492A6] truncate">{c.label}</div>
              <div className="text-[22px] leading-none font-bold tnum mt-1" style={{ color: c.color }}>{nf.format(c.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสินค้า, ผู้ขาย, หมายเหตุ…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        <button onClick={openNew} className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]">
          ＋ เพิ่มอุปกรณ์ที่จัดซื้อ
        </button>
      </div>

      {/* status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', ...PURCHASE_STATUS_ORDER] as const).map((s) => {
          const active = filter === s
          const label = s === 'ALL' ? 'ทั้งหมด' : PURCHASE_STATUS[s].label
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${active ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
              {label} <span className="tnum opacity-70">{counts[s] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {formOpen && <PurchaseForm editing={editing} onClose={() => setFormOpen(false)} onDone={() => { setFormOpen(false); router.refresh() }} />}

      {/* list */}
      <div className="flex flex-col gap-3">
        {shown.length === 0 && (
          <div className="ds-card p-8 text-center text-[#8492A6] text-sm">
            {items.length === 0 ? 'ยังไม่มีงานจัดซื้อ — กด “＋ เพิ่มอุปกรณ์ที่จัดซื้อ” เพื่อเริ่ม' : 'ไม่พบรายการ'}
          </div>
        )}
        {shown.map((it) => <PurchaseCard key={it.id} item={it} canDelete={canDelete} onStatus={(s) => patch(it.id, { status: s })} onEdit={() => openEdit(it)} onDelete={() => remove(it.id)} />)}
      </div>
    </div>
  )
}

function StepTracker({ status }: { status: PurchaseStatus }) {
  if (status === 'CANCELLED') {
    return <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#C13540] bg-[#FBE4E4] rounded-lg px-2.5 py-1">✕ ยกเลิกแล้ว</span>
  }
  const cur = PURCHASE_STATUS[status].step
  return (
    <div className="flex items-start gap-0 overflow-x-auto">
      {PURCHASE_STEPS.map((s, i) => {
        const st = PURCHASE_STATUS[s]
        const done = st.step < cur
        const active = st.step === cur
        const bg = done ? st.color : active ? st.color : '#E1E8F2'
        const textColor = active ? st.color : done ? st.color : '#A8A29E'
        return (
          <div key={s} className="flex items-start shrink-0">
            <div className="flex flex-col items-center gap-1 w-[62px]">
              <div className="flex items-center w-full">
                {/* left connector */}
                <span className="h-[3px] flex-1 rounded" style={{ background: i === 0 ? 'transparent' : (st.step <= cur ? st.color : '#E1E8F2') }} />
                <span className="w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold text-white" style={{ background: bg }}>
                  {done ? '✓' : st.step}
                </span>
                {/* right connector */}
                <span className="h-[3px] flex-1 rounded" style={{ background: i === PURCHASE_STEPS.length - 1 ? 'transparent' : (PURCHASE_STATUS[PURCHASE_STEPS[i + 1]].step <= cur ? PURCHASE_STATUS[PURCHASE_STEPS[i + 1]].color : '#E1E8F2') }} />
              </div>
              <span className={`text-[10.5px] leading-tight text-center ${active ? 'font-bold' : 'font-medium'}`} style={{ color: textColor }}>{st.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PurchaseCard({ item, canDelete, onStatus, onEdit, onDelete }: { item: Item; canDelete: boolean; onStatus: (s: PurchaseStatus) => void; onEdit: () => void; onDelete: () => void }) {
  const st = PURCHASE_STATUS[item.status]
  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-[#1C1917]">{item.itemName}</span>
            <span className="text-[12.5px] text-[#8492A6]">× {nf.format(item.quantity)} {item.unit}</span>
            {item.category && <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EEF1F5] text-[#5A6B82]">{item.category}</span>}
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5 text-[12.5px] text-[#5A6B82]">
            {item.vendor && <span>🏪 {item.vendor}</span>}
            <span>💰 {money(item.price)}</span>
            {item.neededDate && <span>ต้องการ {fmt(item.neededDate)}</span>}
            {item.receivedDate && <span className="text-[#157F4C]">รับ {fmt(item.receivedDate)}</span>}
            {item.requestedByName && <span className="text-[#A8A29E]">โดย {item.requestedByName}</span>}
          </div>
          {item.note && <div className="text-[12px] text-[#8492A6] mt-1">📝 {item.note}</div>}
          <div className="mt-2.5"><StepTracker status={item.status} /></div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          <select value={item.status} onChange={(e) => onStatus(e.target.value as PurchaseStatus)}
            className="border border-[#D6DFEA] rounded-lg px-2 py-1 text-[12px] bg-white outline-none focus:border-[#EA580C]">
            {PURCHASE_STATUS_ORDER.map((s) => <option key={s} value={s}>{PURCHASE_STATUS[s].label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-[#5A6B82] border border-[#E1E8F2] hover:bg-[#F0EEEC]">✎ แก้ไข</button>
            {canDelete && (
              <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-[#C13540] border border-[#F3D2D2] hover:bg-[#FBE4E4]">✕ ลบ</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PurchaseForm({ editing, onClose, onDone }: { editing: Item | null; onClose: () => void; onDone: () => void }) {
  const iso = (s: string | null) => (s ? s.slice(0, 10) : '')
  const [itemName, setItemName] = useState(editing?.itemName ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [quantity, setQuantity] = useState(String(editing?.quantity ?? 1))
  const [unit, setUnit] = useState(editing?.unit ?? 'ชิ้น')
  const [vendor, setVendor] = useState(editing?.vendor ?? '')
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '')
  const [status, setStatus] = useState<PurchaseStatus>(editing?.status ?? 'REQUESTED')
  const [neededDate, setNeededDate] = useState(iso(editing?.neededDate ?? null))
  const [orderedDate, setOrderedDate] = useState(iso(editing?.orderedDate ?? null))
  const [receivedDate, setReceivedDate] = useState(iso(editing?.receivedDate ?? null))
  const [note, setNote] = useState(editing?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim()) { setErr('กรอกชื่อสินค้า/อุปกรณ์'); return }
    setSaving(true); setErr('')
    const body = { itemName, category, quantity, unit, vendor, price, status, neededDate, orderedDate, receivedDate, note }
    try {
      const res = await fetch(editing ? `/api/purchases/${editing.id}` : '/api/purchases', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr(d?.message || 'บันทึกไม่สำเร็จ'); return }
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} className="mx-auto my-4 w-full max-w-xl ds-card p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-[#1C1917]">{editing ? 'แก้ไขงานจัดซื้อ' : 'เพิ่มอุปกรณ์ที่จัดซื้อ'}</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่อสินค้า / อุปกรณ์ <span className="text-[#C13540]">*</span></label>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="เช่น Tablet Lenovo Tab M11" className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ประเภท / หมวด</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เช่น อะไหล่, อุปกรณ์สำนักงาน" className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ผู้ขาย / ร้านค้า</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">จำนวน</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">หน่วย</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ราคา / งบประมาณ (บาท)</label>
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="รวม" className={`${field} tnum`} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สถานะ</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as PurchaseStatus)} className={field}>
              {PURCHASE_STATUS_ORDER.map((s) => <option key={s} value={s}>{PURCHASE_STATUS[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันที่ต้องการใช้</label>
            <input type="date" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} className={`${field} tnum`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันสั่งซื้อ</label>
              <input type="date" value={orderedDate} onChange={(e) => setOrderedDate(e.target.value)} className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันรับของ</label>
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={`${field} tnum`} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">หมายเหตุ</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
              {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มงานจัดซื้อ'}
            </button>
            <button type="button" onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
            {err && <span className="text-sm text-[#C13540]">{err}</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
