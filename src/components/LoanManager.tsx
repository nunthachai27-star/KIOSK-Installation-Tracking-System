'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { confirmDialog, promptDialog, alertDialog } from '@/lib/dialog'
import { LOAN_LEVEL_META, type LoanLevel } from '@/lib/loan'

type Row = {
  id: string; borrowerName: string; borrowerPhone: string; borrowerOrg: string | null; purpose: string | null
  borrowedAt: string; dueDate: string; returnedAt: string | null; returnNote: string | null
  level: LoanLevel; serialBMS: string | null; serialNo: string | null; color: string | null
  lotCode: string; productName: string; group: string; recordedBy: string | null
}
type Option = { id: string; serialBMS: string | null; serialNo: string | null; color: string | null; lotCode: string; productName: string; group: string }
type Req = {
  id: string; borrowerName: string; borrowerPhone: string; borrowerOrg: string | null
  purpose: string | null; dueDate: string | null; createdAt: string
}
type Prefill = { name: string; phone: string; org: string; purpose: string; due: string }

const nf = new Intl.NumberFormat('th-TH')
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dFmt.format(new Date(iso)) : '—')
const serialOf = (o: { serialBMS: string | null; serialNo: string | null }) => o.serialBMS ?? o.serialNo ?? '(ไม่มี Serial)'
const labelOf = (o: Option) => `${serialOf(o)} · ${o.productName} · Lot ${o.lotCode}${o.color ? ` · ${o.color}` : ''}`
const uniqSorted = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'th'))

// Default the due date a week out — the common case for a short site loan.
function defaultDue() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function LoanManager({ rows, options, requests, outCount, overdueCount, availableCount }: {
  rows: Row[]; options: Option[]; requests: Req[]; outCount: number; overdueCount: number; availableCount: number
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'OUT' | 'ALL'>('OUT')
  const [open, setOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [approving, setApproving] = useState<Req | null>(null) // คำขอที่กำลังเลือกอุปกรณ์ & อนุมัติ

  const ql = q.trim().toLowerCase()
  const shown = useMemo(() => rows.filter((r) => {
    if (tab === 'OUT' && r.returnedAt) return false
    if (!ql) return true
    return [r.borrowerName, r.borrowerPhone, r.borrowerOrg, r.serialBMS, r.serialNo, r.productName]
      .some((v) => (v ?? '').toLowerCase().includes(ql))
  }), [rows, tab, ql])

  const cards = [
    { icon: '📦', bg: '#E2F3EA', label: 'ว่างให้ยืม', value: availableCount, color: '#157F4C' },
    { icon: '🤝', bg: '#E4EEFF', label: 'ถูกยืมอยู่', value: outCount, color: '#1B5FD9' },
    { icon: '⚠️', bg: '#FBE4E4', label: 'เกินกำหนดคืน', value: overdueCount, color: overdueCount > 0 ? '#C13540' : '#1C1917' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {cards.map((c) => (
          <div key={c.label} className="ds-card ds-hover px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl grid place-items-center text-[18px] shrink-0" style={{ background: c.bg }}>{c.icon}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#8492A6] truncate">{c.label}</div>
              <div className="text-[22px] leading-none font-bold tnum mt-1" style={{ color: c.color }}>{nf.format(c.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {overdueCount > 0 && (
        <div className="ds-card px-4 py-3 border-l-4 border-l-[#C13540] bg-[#FFF7F7] text-[13px] text-[#8A2C34]">
          ⚠️ มีของที่ <b>เกินกำหนดคืน {nf.format(overdueCount)} รายการ</b> — ติดตามจากเบอร์โทรผู้ยืมในตารางด้านล่าง
        </div>
      )}

      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา Serial, ชื่อผู้ยืม, เบอร์โทร…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        {(['OUT', 'ALL'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${tab === t ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {t === 'OUT' ? 'ที่ยังไม่คืน' : 'ทั้งหมด'}
          </button>
        ))}
        <button onClick={() => setShowQR(true)}
          className="ds-hover text-sm font-semibold rounded-lg px-4 py-2 border border-[#1B5FD9] text-[#1B5FD9] bg-white hover:bg-[#EEF3FA]"
          title="สร้าง QR / ลิงก์ให้ผู้ยืมกรอกคำขอเอง">
          🔗 QR ให้ผู้ยืม
        </button>
        <button onClick={() => { setApproving(null); setOpen((v) => !v) }} disabled={options.length === 0}
          className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] disabled:opacity-50 disabled:cursor-not-allowed"
          title={options.length === 0 ? 'ไม่มีอุปกรณ์ว่างในคลัง' : undefined}>
          ＋ ยืมของ
        </button>
      </div>

      {showQR && <QrModal onClose={() => setShowQR(false)} />}

      {/* Pending public borrow requests awaiting staff review. */}
      {requests.length > 0 && (
        <div className="ds-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[14px] font-bold text-[#1C1917]">📥 คำขอยืมรออนุมัติ</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FCE7D6] text-[#EA580C] text-[12px] font-bold tnum">{nf.format(requests.length)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {requests.map((rq) => (
              <RequestCard key={rq.id} rq={rq}
                onApprove={() => { setOpen(false); setApproving(rq) }}
                onDone={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      {(open || approving) && (
        <BorrowForm key={approving?.id ?? 'manual'} options={options}
          prefill={approving ? { name: approving.borrowerName, phone: approving.borrowerPhone, org: approving.borrowerOrg ?? '', purpose: approving.purpose ?? '', due: approving.dueDate ?? '' } : undefined}
          requestId={approving?.id}
          onClose={() => { setOpen(false); setApproving(null) }}
          onDone={() => { setOpen(false); setApproving(null); router.refresh() }} />
      )}

      <div className="ds-card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[900px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-3 py-2.5 font-semibold">Serial</th>
              <th className="px-3 py-2.5 font-semibold">รุ่น / อุปกรณ์</th>
              <th className="px-3 py-2.5 font-semibold">ผู้ยืม</th>
              <th className="px-3 py-2.5 font-semibold">เบอร์โทร</th>
              <th className="px-3 py-2.5 font-semibold">วันที่ยืม</th>
              <th className="px-3 py-2.5 font-semibold">กำหนดคืน</th>
              <th className="px-3 py-2.5 font-semibold">สถานะ</th>
              <th className="px-3 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#8492A6]">
                {rows.length === 0 ? 'ยังไม่มีรายการยืม — กด “＋ ยืมของ” เพื่อเริ่ม' : 'ไม่พบรายการ'}
              </td></tr>
            )}
            {shown.map((r) => <LoanRow key={r.id} r={r} onDone={() => router.refresh()} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoanRow({ r, onDone }: { r: Row; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const meta = LOAN_LEVEL_META[r.level]

  async function giveBack() {
    const note = await promptDialog({ title: 'รับคืนอุปกรณ์', message: 'บันทึกสภาพของ (เว้นว่างได้)', placeholder: 'เช่น สภาพปกติ / มีรอยขีดข่วน', multiline: true, confirmText: 'รับคืน' })
    if (note === null) return // cancelled
    setBusy(true)
    try {
      const res = await fetch(`/api/loans/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnNote: note }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        await alertDialog(d?.message || 'รับคืนไม่สำเร็จ')
        return
      }
      onDone()
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!(await confirmDialog({ title: 'ลบรายการยืม-คืน', message: `${serialOf(r)} · ผู้ยืม ${r.borrowerName}\nลบได้เฉพาะรายการที่คืนแล้ว — ลบแล้วกู้คืนไม่ได้`, danger: true, confirmText: 'ลบ' }))) return
    setBusy(true)
    try {
      const res = await fetch(`/api/loans/${r.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        await alertDialog(d?.message || 'ลบไม่สำเร็จ')
        return
      }
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <tr className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
      <td className="px-3 py-2 whitespace-nowrap font-bold tnum text-[#1C1917]">{serialOf(r)}</td>
      <td className="px-3 py-2 max-w-[190px] truncate" title={`${r.group} · ${r.productName}`}>{r.productName}</td>
      <td className="px-3 py-2">
        <div className="text-[#1C1917]">{r.borrowerName}</div>
        {r.borrowerOrg && <div className="text-[11.5px] text-[#8492A6]">{r.borrowerOrg}</div>}
      </td>
      <td className="px-3 py-2 tnum whitespace-nowrap">
        <a href={`tel:${r.borrowerPhone}`} className="text-[#EA580C] hover:underline">{r.borrowerPhone}</a>
      </td>
      <td className="px-3 py-2 text-[11.5px] text-[#5A6B82] whitespace-nowrap">{fmt(r.borrowedAt)}</td>
      <td className="px-3 py-2 text-[11.5px] whitespace-nowrap" style={{ color: r.level === 'OVERDUE' ? '#C13540' : '#5A6B82', fontWeight: r.level === 'OVERDUE' ? 700 : 400 }}>
        {fmt(r.dueDate)}
      </td>
      <td className="px-3 py-2">
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        {r.returnedAt && <div className="text-[10.5px] text-[#A8A29E] mt-0.5">{fmt(r.returnedAt)}</div>}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {!r.returnedAt ? (
          <button onClick={giveBack} disabled={busy}
            className="text-[12px] font-semibold text-[#157F4C] hover:underline disabled:opacity-50">
            {busy ? 'กำลังบันทึก…' : 'รับคืน'}
          </button>
        ) : (
          <button onClick={remove} disabled={busy} title="ลบรายการนี้ (คืนแล้ว)"
            className="w-6 h-6 grid place-items-center rounded-md text-[12px] text-[#C4BFB9] hover:text-[#C13540] hover:bg-[#FBE4E4] disabled:opacity-50">✕</button>
        )}
      </td>
    </tr>
  )
}

function BorrowForm({ options, prefill, requestId, onClose, onDone }: { options: Option[]; prefill?: Prefill; requestId?: string; onClose: () => void; onDone: () => void }) {
  const approving = !!requestId
  const [itemId, setItemId] = useState('')
  const [pick, setPick] = useState('')
  // Narrow down group → product → lot before picking a serial, so the list of
  // serials stays short enough to scan instead of dumping the whole warehouse.
  const [group, setGroup] = useState('')
  const [productName, setProductName] = useState('')
  const [lotCode, setLotCode] = useState('')
  const [name, setName] = useState(prefill?.name ?? '')
  const [phone, setPhone] = useState(prefill?.phone ?? '')
  const [org, setOrg] = useState(prefill?.org ?? '')
  const [purpose, setPurpose] = useState(prefill?.purpose ?? '')
  const [due, setDue] = useState(prefill?.due || defaultDue())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const pl = pick.trim().toLowerCase()
  const chosen = options.find((o) => o.id === itemId) ?? null

  // Each level offers only what the level above it still allows.
  const groups = useMemo(() => uniqSorted(options.map((o) => o.group)), [options])
  const products = useMemo(
    () => uniqSorted(options.filter((o) => o.group === group).map((o) => o.productName)),
    [options, group],
  )
  const lots = useMemo(
    () => uniqSorted(options.filter((o) => o.group === group && o.productName === productName).map((o) => o.lotCode)),
    [options, group, productName],
  )
  const serials = useMemo(() => {
    if (!group || !productName || !lotCode) return []
    const inLot = options.filter((o) => o.group === group && o.productName === productName && o.lotCode === lotCode)
    return (pl ? inLot.filter((o) => labelOf(o).toLowerCase().includes(pl)) : inLot).slice(0, 50)
  }, [options, group, productName, lotCode, pl])

  function pickGroup(g: string) { setGroup(g); setProductName(''); setLotCode(''); setItemId(''); setPick('') }
  function pickProduct(p: string) { setProductName(p); setLotCode(''); setItemId(''); setPick('') }
  function pickLot(l: string) { setLotCode(l); setItemId(''); setPick('') }

  // Mirrors the API's rules so the button only enables on input it will accept.
  const phoneOk = /^\d{9,10}$/.test(phone.replace(/[\s-]/g, ''))
  const ready = !!itemId && !!name.trim() && phoneOk && /^\d{4}-\d{2}-\d{2}$/.test(due)

  async function submit() {
    if (!ready) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/loans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, borrowerName: name, borrowerPhone: phone, borrowerOrg: org, purpose, dueDate: due, requestId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErr(d?.message || 'บันทึกไม่สำเร็จ')
        return
      }
      onDone()
    } finally { setSaving(false) }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'
  const req = <span className="text-[#C13540]">*</span>

  return (
    <div className="ds-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-bold">{approving ? '✅ อนุมัติคำขอยืม — เลือกอุปกรณ์ให้ผู้ยืม' : 'ยืมอุปกรณ์จากคลัง'}</div>
        <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
      </div>
      {approving && <div className="mb-3 text-[12.5px] text-[#5A6B82] bg-[#F0F6FF] border border-[#DCE9FF] rounded-lg px-3 py-2">ข้อมูลผู้ยืมมาจากคำขอ (แก้ไขได้) · เลือกกลุ่ม → รุ่น → Lot → Serial แล้วกดบันทึกเพื่ออนุมัติ</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">อุปกรณ์ที่ยืม {req}</label>
          {chosen ? (
            <div className="flex items-center gap-2 border border-[#D6DFEA] rounded-lg px-3 py-2.5 bg-[#F8FAFD]">
              <span className="text-sm text-[#1C1917] flex-1 truncate">{labelOf(chosen)}</span>
              <button onClick={() => { setItemId(''); setPick('') }} className="text-[12px] font-semibold text-[#EA580C] hover:underline shrink-0">เปลี่ยน</button>
            </div>
          ) : (
            <div className="border border-[#EEF2F8] rounded-xl p-3 bg-[#FBFCFE] flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <div className="text-[11.5px] font-semibold text-[#8492A6] mb-1">1 · กลุ่มสินค้า</div>
                  <select value={group} onChange={(e) => pickGroup(e.target.value)} className={`${field} py-2`}>
                    <option value="">— เลือก —</option>
                    {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-[#8492A6] mb-1">2 · รุ่น / อุปกรณ์</div>
                  <select value={productName} onChange={(e) => pickProduct(e.target.value)} disabled={!group} className={`${field} py-2 disabled:bg-[#F4F6F9] disabled:text-[#A8A29E]`}>
                    <option value="">{group ? '— เลือก —' : 'เลือกกลุ่มก่อน'}</option>
                    {products.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-[#8492A6] mb-1">3 · Lot</div>
                  <select value={lotCode} onChange={(e) => pickLot(e.target.value)} disabled={!productName} className={`${field} py-2 disabled:bg-[#F4F6F9] disabled:text-[#A8A29E]`}>
                    <option value="">{productName ? '— เลือก —' : 'เลือกรุ่นก่อน'}</option>
                    {lots.map((l) => <option key={l} value={l}>Lot {l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-[11.5px] font-semibold text-[#8492A6] mb-1">4 · Serial ที่อยู่ในคลัง</div>
                {!lotCode ? (
                  <div className="px-3 py-4 text-[13px] text-[#A8A29E] border border-dashed border-[#DDE5EF] rounded-lg text-center">
                    เลือกกลุ่ม → รุ่น → Lot ให้ครบก่อน จึงจะเลือก Serial ได้
                  </div>
                ) : (
                  <>
                    <input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="พิมพ์กรอง Serial ใน Lot นี้…" className={`${field} py-2`} />
                    <div className="mt-1.5 max-h-48 overflow-y-auto border border-[#EEF2F8] rounded-lg divide-y divide-[#F4F7FB] bg-white">
                      {serials.length === 0 && <div className="px-3 py-3 text-[13px] text-[#8492A6]">ไม่มี Serial ว่างใน Lot นี้</div>}
                      {serials.map((o) => (
                        <button key={o.id} onClick={() => setItemId(o.id)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#FBFAF8]">
                          <span className="font-bold tnum text-[#1C1917]">{serialOf(o)}</span>
                          {o.color && <span className="text-[#8492A6] ml-2">{o.color}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11.5px] text-[#A8A29E] mt-1">
                      ว่างให้ยืมใน Lot นี้ {serials.length} รายการ — ของที่จ่ายออกหรือถูกยืมอยู่จะไม่ขึ้นให้เลือก
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่อผู้ยืม {req}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" className={field} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">เบอร์โทร {req}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" inputMode="tel" className={`${field} tnum`} />
          {phone && !phoneOk && <div className="text-[11.5px] text-[#C13540] mt-1">ต้องเป็นตัวเลข 9-10 หลัก</div>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">หน่วยงาน / สังกัด</label>
          <input value={org} onChange={(e) => setOrg(e.target.value)} className={field} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">กำหนดคืน {req}</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} tnum`} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วัตถุประสงค์</label>
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="เช่น สาธิตงานที่ รพ. …" className={field} />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button onClick={submit} disabled={!ready || saving}
            className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'กำลังบันทึก…' : approving ? 'อนุมัติ & บันทึกการยืม' : 'บันทึกการยืม'}
          </button>
          {!ready && !err && <span className="text-[12.5px] text-[#8492A6]">กรอกอุปกรณ์ ชื่อ เบอร์โทร และกำหนดคืนให้ครบก่อน</span>}
          {err && <span className="text-sm text-[#C13540]">{err}</span>}
        </div>
      </div>
    </div>
  )
}

// One pending public borrow request — staff either approve (pick an item) or reject it.
function RequestCard({ rq, onApprove, onDone }: { rq: Req; onApprove: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  async function reject() {
    if (!(await confirmDialog({ title: 'ปฏิเสธคำขอยืม', message: `ปฏิเสธคำขอยืมของ ${rq.borrowerName}?`, danger: true, confirmText: 'ปฏิเสธ' }))) return
    const note = (await promptDialog({ title: 'เหตุผลการปฏิเสธ', message: 'ระบุเหตุผล (เว้นว่างได้)', multiline: true, confirmText: 'ยืนยัน' })) ?? ''
    setBusy(true)
    try {
      const res = await fetch(`/api/borrow-request/${rq.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); await alertDialog(d?.message || 'ปฏิเสธไม่สำเร็จ'); return }
      onDone()
    } finally { setBusy(false) }
  }
  return (
    <div className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] px-3.5 py-3 flex flex-wrap items-start gap-x-4 gap-y-1.5">
      <div className="min-w-[180px] flex-1">
        <div className="text-[13.5px] font-semibold text-[#1C1917]">{rq.borrowerName}
          <a href={`tel:${rq.borrowerPhone}`} className="ml-2 text-[12.5px] font-normal text-[#EA580C] hover:underline tnum">{rq.borrowerPhone}</a>
        </div>
        {rq.borrowerOrg && <div className="text-[12px] text-[#8492A6]">{rq.borrowerOrg}</div>}
        {rq.purpose && <div className="text-[12.5px] text-[#5A6B82] mt-0.5">“{rq.purpose}”</div>}
        <div className="text-[11px] text-[#A8A29E] mt-0.5">
          ส่งคำขอ {fmt(rq.createdAt)}{rq.dueDate && <> · อยากคืนภายใน {fmt(rq.dueDate)}</>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onApprove} disabled={busy}
          className="bg-[#EA580C] text-white text-[12.5px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#C2410C] disabled:opacity-50">เลือกอุปกรณ์ & อนุมัติ</button>
        <button onClick={reject} disabled={busy}
          className="text-[12.5px] font-semibold text-[#C13540] rounded-lg px-3 py-1.5 border border-[#F0D2D2] hover:bg-[#FBE4E4] disabled:opacity-50">ปฏิเสธ</button>
      </div>
    </div>
  )
}

// QR + link for borrowers to submit a request themselves (no login).
function QrModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const u = `${window.location.origin}/borrow`
    setUrl(u)
    QRCode.toDataURL(u, { width: 480, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(''))
  }, [])

  function copy() {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  function print() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>QR ขอยืมอุปกรณ์</title></head><body style="text-align:center;font-family:sans-serif;padding:40px">
      <h2>สแกนเพื่อขอยืมอุปกรณ์ (BMS)</h2><img src="${dataUrl}" style="width:320px;height:320px"/><p style="color:#555">${url}</p></body></html>`)
    w.document.close(); w.focus(); w.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-start justify-center overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mt-10 w-full max-w-sm bg-white rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[15px] font-bold text-[#1C1917]">QR / ลิงก์ให้ผู้ยืม</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <p className="text-[12.5px] text-[#5A6B82] mb-3">ให้ผู้ยืมสแกน QR หรือเปิดลิงก์นี้เพื่อกรอกคำขอเอง (ไม่ต้อง login) — คำขอจะเข้ามาในคิว “รออนุมัติ”</p>
        <div className="grid place-items-center mb-3">
          {dataUrl
            ? <img src={dataUrl} alt="QR ขอยืม" className="w-56 h-56 rounded-xl border border-[#EEEAE6]" />
            : <div className="w-56 h-56 grid place-items-center text-[#A8A29E] text-[13px]">กำลังสร้าง QR…</div>}
        </div>
        <div className="flex items-center gap-2 border border-[#D6DFEA] rounded-lg px-3 py-2 mb-2">
          <span className="text-[12.5px] text-[#1C1917] flex-1 truncate tnum">{url}</span>
          <button onClick={copy} className="text-[12px] font-semibold text-[#EA580C] hover:underline shrink-0">{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</button>
        </div>
        <button onClick={print} disabled={!dataUrl} className="w-full text-[13px] font-semibold text-[#1B5FD9] border border-[#1B5FD9] rounded-lg py-2 hover:bg-[#EEF3FA] disabled:opacity-50">🖨️ พิมพ์ QR</button>
      </div>
    </div>
  )
}
