'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IssueStatus, IssueEventType, IssueMethod, IssueWarranty } from '@prisma/client'
import { Combobox } from './Combobox'
import {
  ISSUE_STATUS, ISSUE_STATUS_ORDER, ISSUE_OPEN_STATUSES, ISSUE_EVENT,
  ISSUE_METHOD, ISSUE_WARRANTY, warrantyStateFrom,
} from '@/lib/issue'

type SerialOpt = { id: string; serialNo: string; hospital: string; jobCode: string; productType: string; warrantyEndDate: string | null }
type IssueEvt = {
  id: string; type: IssueEventType; fromStatus: IssueStatus | null; toStatus: IssueStatus | null
  note: string | null; actorName: string | null; createdAt: string
}
type Item = {
  id: string; serialNo: string | null; hospital: string; jobCode: string; productType: string
  title: string; solution: string | null; status: IssueStatus
  warrantyState: IssueWarranty; method: IssueMethod | null
  failedSerial: string | null; replacementSerial: string | null; cost: number | null
  reporter: string | null; updatedAt: string; events: IssueEvt[]
}
type PatchBody = {
  status?: IssueStatus; solution?: string | null; warrantyState?: IssueWarranty
  method?: IssueMethod | null; failedSerial?: string | null; replacementSerial?: string | null; cost?: number | null
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

export function IssueManager({ serials, initial }: { serials: SerialOpt[]; initial: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  // Keep in sync with the server after router.refresh() so the timeline/claim data reflect updates.
  useEffect(() => { setItems(initial) }, [initial])
  const [serialId, setSerialId] = useState('')
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

  const comboOpts = serials.map((s) => ({ id: s.id, label: s.serialNo, sub: `${s.hospital} · ${s.jobCode}` }))
  const selectedSerial = serials.find((s) => s.id === serialId)

  function onPickSerial(id: string) {
    setSerialId(id)
    const s = serials.find((x) => x.id === id)
    setWarranty(s ? warrantyStateFrom(s.warrantyEndDate) : 'UNKNOWN')
  }

  async function add() {
    if (!serialId) { setErr('เลือก S/N BMS ก่อน'); return }
    if (!title.trim()) { setErr('ระบุอาการ/ชื่อปัญหา'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/issues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialId, title, solution, status, warrantyState: warranty, method: method || null, failedSerial, replacementSerial, cost }),
      })
      if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
      const created = await res.json()
      const s = serials.find((x) => x.id === serialId)!
      setItems((x) => [{
        id: created.id, serialNo: s.serialNo, hospital: s.hospital, jobCode: s.jobCode, productType: s.productType,
        title: title.trim(), solution: solution.trim() || null, status,
        warrantyState: warranty, method: method || null,
        failedSerial: failedSerial.trim() || null, replacementSerial: replacementSerial.trim() || null,
        cost: cost && !isNaN(Number(cost)) ? Number(cost) : null,
        reporter: null, updatedAt: new Date().toISOString(), events: [],
      }, ...x])
      setSerialId(''); setTitle(''); setSolution(''); setStatus('RECEIVED'); setWarranty('UNKNOWN')
      setMethod(''); setFailedSerial(''); setReplacementSerial(''); setCost('')
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

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'
  const shown = filter === 'ALL' ? items
    : filter === 'OPEN' ? items.filter((i) => (ISSUE_OPEN_STATUSES as IssueStatus[]).includes(i.status))
    : items.filter((i) => i.status === filter)
  const openCount = items.filter((i) => (ISSUE_OPEN_STATUSES as IssueStatus[]).includes(i.status)).length
  // Only surface status chips that actually have records, to keep the filter compact.
  const statusChips = ISSUE_STATUS_ORDER.map((st) => ({ st, n: items.filter((i) => i.status === st).length })).filter((c) => c.n > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* add form */}
      <div className="ds-card p-5">
        <div className="text-[15px] font-bold mb-4">แจ้งเคลมใหม่</div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">S/N BMS (ตู้/เครื่อง)</label>
            <Combobox value={serialId} onChange={onPickSerial} options={comboOpts} placeholder="พิมพ์ค้นหา S/N BMS หรือชื่อโรงพยาบาล…" />
            {selectedSerial && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[12.5px] text-[#5A6B82]">
                <span>{selectedSerial.hospital} · {selectedSerial.productType}</span>
                <WarrantyBadge w={warrantyStateFrom(selectedSerial.warrantyEndDate)} />
                <span className="text-[#A8A29E]">(อัตโนมัติจากวันเปิดบิล +1 ปี)</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">อาการเสีย / ชื่อปัญหา</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น จอไม่ติด, Smartcard ใช้ไม่ได้" className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">การรับประกัน</label>
              <select value={warranty} onChange={(e) => setWarranty(e.target.value as IssueWarranty)} className={field}>
                {(Object.keys(ISSUE_WARRANTY) as IssueWarranty[]).map((w) => <option key={w} value={w}>{ISSUE_WARRANTY[w].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">Serial อุปกรณ์ที่เสีย</label>
              <input value={failedSerial} onChange={(e) => setFailedSerial(e.target.value)} placeholder="Serial ชิ้นที่พัง" className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">Serial ที่ส่งเปลี่ยนให้ลูกค้า</label>
              <input value={replacementSerial} onChange={(e) => setReplacementSerial(e.target.value)} placeholder="Serial ชิ้นทดแทน" className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ค่าใช้จ่าย (บาท)</label>
              <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="กรณีนอกประกัน" className={`${field} tnum`} />
            </div>
          </div>
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
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วิธีดำเนินการ</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as IssueMethod | '')} className={`${field} w-48`}>
                <option value="">— ไม่ระบุ —</option>
                {(Object.keys(ISSUE_METHOD) as IssueMethod[]).map((m) => <option key={m} value={m}>{ISSUE_METHOD[m]}</option>)}
              </select>
            </div>
            <button onClick={add} disabled={saving}
              className="ds-hover bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
              {saving ? 'กำลังบันทึก…' : 'บันทึกเคลม'}
            </button>
            {err && <span className="text-sm text-[#C13540]">{err}</span>}
          </div>
        </div>
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${filter === 'ALL' ? 'bg-[#FFEDE1] text-[#EA580C]' : 'text-[#5A6B82] hover:bg-[#F0EEEC]'}`}>
          ทั้งหมด {items.length}
        </button>
        <button onClick={() => setFilter('OPEN')}
          className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${filter === 'OPEN' ? 'bg-[#E4EEFF] text-[#1B5FD9]' : 'text-[#5A6B82] hover:bg-[#F0EEEC]'}`}>
          กำลังดำเนินการ {openCount}
        </button>
        {statusChips.map(({ st, n }) => (
          <button key={st} onClick={() => setFilter(st)}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
            style={filter === st ? { background: ISSUE_STATUS[st].bg, color: ISSUE_STATUS[st].color } : { color: '#5A6B82' }}>
            {ISSUE_STATUS[st].label} {n}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="flex flex-col gap-3">
        {shown.length === 0 && <div className="ds-card p-6 text-sm text-[#8492A6]">ไม่มีรายการ</div>}
        {shown.map((it) => (
          <IssueCard key={it.id} item={it} onPatch={(b) => patch(it.id, b)} onDelete={() => remove(it.id)} />
        ))}
      </div>
    </div>
  )
}

function IssueCard({ item, onPatch, onDelete }: { item: Item; onPatch: (b: PatchBody) => void; onDelete: () => void }) {
  const [sol, setSol] = useState(item.solution ?? '')
  const [failed, setFailed] = useState(item.failedSerial ?? '')
  const [repl, setRepl] = useState(item.replacementSerial ?? '')
  const [cost, setCost] = useState(item.cost != null ? String(item.cost) : '')
  const [openTl, setOpenTl] = useState(false)
  const meta = ISSUE_STATUS[item.status]

  const solDirty = (item.solution ?? '') !== sol
  const claimDirty = (item.failedSerial ?? '') !== failed.trim()
    || (item.replacementSerial ?? '') !== repl.trim()
    || (item.cost != null ? String(item.cost) : '') !== cost.trim()

  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.serialNo && <span className="tnum text-sm font-bold text-[#1C1917]">{item.serialNo}</span>}
            <span className="text-[12.5px] text-[#8492A6]">{item.hospital} · {item.jobCode} · {item.productType}</span>
            <WarrantyBadge w={item.warrantyState} />
          </div>
          <div className="text-[15px] font-semibold text-[#1C1917] mt-1">{item.title}</div>
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

      {/* claim detail: warranty / method / serials / cost */}
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

      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <div className="text-[11px] text-[#A8A29E]">
          {item.reporter ? `แจ้งโดย ${item.reporter} · ` : ''}อัปเดต {fmt(item.updatedAt)}
        </div>
        {item.events.length > 0 && (
          <button onClick={() => setOpenTl((o) => !o)}
            className="text-[12px] font-semibold text-[#EA580C] hover:underline">
            {openTl ? '▾' : '▸'} Timeline การติดตาม ({item.events.length})
          </button>
        )}
      </div>

      {openTl && item.events.length > 0 && (
        <ol className="mt-3 pt-3 border-t border-[#F1F5F9]">
          {item.events.map((e, idx) => {
            const ev = ISSUE_EVENT[e.type]
            const last = idx === item.events.length - 1
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
