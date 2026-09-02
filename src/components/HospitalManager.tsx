'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

type Contact = { name: string; phone: string; position: string; note: string }
type Item = { id: string; name: string; province: string; jobCount: number; code: string; address: string; contacts: Contact[] }
const nf = new Intl.NumberFormat('th-TH')
const PER_PAGE = 20
const emptyContact = (): Contact => ({ name: '', phone: '', position: '', note: '' })

export function HospitalManager({ initial, provinceOptions }: { initial: Item[]; provinceOptions: string[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const [newName, setNewName] = useState('')
  const [newProvince, setNewProvince] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const ql = q.trim().toLowerCase()
  const filtered = ql ? items.filter((h) => `${h.name} ${h.province} ${h.code}`.toLowerCase().includes(ql)) : items
  useEffect(() => { setPage(1) }, [ql])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const cur = Math.min(page, pageCount)
  const rows = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  async function addHospital() {
    if (!newName.trim()) { setErr('ระบุชื่อโรงพยาบาล'); return }
    setAdding(true); setErr('')
    try {
      const res = await fetch('/api/hospitals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, province: newProvince }),
      })
      if (!res.ok) { setErr('เพิ่มไม่สำเร็จ'); return }
      setNewName(''); setNewProvince('')
      router.refresh()
    } finally { setAdding(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="ds-card p-4">
        <div className="text-[13.5px] font-bold text-[#1C1917] mb-2.5">＋ เพิ่มโรงพยาบาลใหม่</div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">ชื่อโรงพยาบาล</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เช่น โรงพยาบาลบางปะกอก"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="w-48">
            <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">จังหวัด</label>
            <input value={newProvince} onChange={(e) => setNewProvince(e.target.value)} list="province-list" placeholder="จังหวัด"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <button onClick={addHospital} disabled={adding}
            className="bg-[var(--brand)] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {adding ? 'กำลังเพิ่ม…' : 'เพิ่ม'}
          </button>
        </div>
        <p className="text-[11.5px] text-[#96A2B5] mt-2">เพิ่มชื่อ/จังหวัดก่อนได้ · รหัสสถานพยาบาล ที่อยู่ และผู้ติดต่อ กด “รายละเอียด” เพื่อกรอกภายหลัง</p>
        {err && <div className="text-[12.5px] text-[#C13540] mt-2">{err}</div>}
      </div>

      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงพยาบาล / จังหวัด / รหัส…"
          className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]">🔍</span>
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
      </div>

      <div className="text-[12.5px] text-[#8492A6]">ทั้งหมด {nf.format(filtered.length)} โรงพยาบาล{ql ? ` (ค้นหา “${q.trim()}”)` : ''}</div>

      <div className="ds-card overflow-hidden">
        {rows.length === 0 && <div className="px-5 py-8 text-sm text-[#8492A6] text-center">ไม่พบโรงพยาบาล</div>}
        {rows.map((h) => (
          <HospitalRow key={h.id} item={h}
            onSaved={(patch) => setItems((x) => x.map((i) => (i.id === h.id ? { ...i, ...patch } : i)))}
            onDeleted={() => setItems((x) => x.filter((i) => i.id !== h.id))}
            refresh={() => router.refresh()} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-[#8492A6]">หน้า {nf.format(cur)} / {nf.format(pageCount)}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, cur - 1))} disabled={cur === 1}
              className="min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] hover:bg-[#F0EEEC] disabled:text-[#D4CFC9]">‹</button>
            <button onClick={() => setPage(Math.min(pageCount, cur + 1))} disabled={cur === pageCount}
              className="min-w-[30px] h-[30px] grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] hover:bg-[#F0EEEC] disabled:text-[#D4CFC9]">›</button>
          </div>
        </div>
      )}

      <datalist id="province-list">
        {provinceOptions.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  )
}

function HospitalRow({ item, onSaved, onDeleted, refresh }: {
  item: Item
  onSaved: (patch: Partial<Item>) => void; onDeleted: () => void; refresh: () => void
}) {
  const [name, setName] = useState(item.name)
  const [province, setProvince] = useState(item.province)
  const [code, setCode] = useState(item.code)
  const [address, setAddress] = useState(item.address)
  const [contacts, setContacts] = useState<Contact[]>(item.contacts)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setName(item.name); setProvince(item.province); setCode(item.code); setAddress(item.address); setContacts(item.contacts)
  }, [item])

  const norm = (c: Contact[]) => JSON.stringify(c.map((x) => ({ name: x.name.trim(), phone: x.phone.trim(), position: x.position.trim(), note: x.note.trim() })))
  const dirty = name.trim() !== item.name || province.trim() !== item.province || code.trim() !== item.code
    || address.trim() !== item.address || norm(contacts) !== norm(item.contacts)

  const setC = (idx: number, k: keyof Contact, v: string) => setContacts((cs) => cs.map((c, i) => (i === idx ? { ...c, [k]: v } : c)))

  async function save() {
    if (!name.trim()) { setMsg('ชื่อห้ามว่าง'); return }
    setSaving(true); setMsg('')
    try {
      const cleanContacts = contacts.filter((c) => c.name.trim())
      const res = await fetch(`/api/hospitals/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, province, code, address, contacts: cleanContacts }),
      })
      if (!res.ok) { setMsg('บันทึกไม่สำเร็จ'); return }
      const saved = { name: name.trim(), province: province.trim(), code: code.trim(), address: address.trim(), contacts: cleanContacts }
      setContacts(cleanContacts)
      onSaved(saved)
      refresh()
    } finally { setSaving(false) }
  }

  async function del() {
    if (item.jobCount > 0) return
    if (!(await confirmDialog({ title: 'ลบโรงพยาบาล', message: `ลบ "${item.name}" ?`, danger: true, confirmText: 'ลบ' }))) return
    const res = await fetch(`/api/hospitals/${item.id}`, { method: 'DELETE' })
    if (res.ok) { onDeleted(); refresh() }
    else setMsg('ลบไม่สำเร็จ')
  }

  const inp = 'border border-transparent hover:border-[#E1E8F2] focus:border-[var(--brand)] rounded-lg px-2.5 py-1.5 text-sm outline-none'
  const fld = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]'

  return (
    <div className="border-t border-[#F1F3F6] first:border-t-0">
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FBFAF8] flex-wrap">
        <button onClick={() => setOpen((v) => !v)} title="รายละเอียด"
          className="w-8 h-8 shrink-0 rounded-lg bg-[#EEF3FA] text-[#5A6B82] grid place-items-center hover:bg-[#E2ECF7]">
          <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        </button>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className={`${inp} flex-1 min-w-[180px] font-semibold text-[#1C1917]`} />
        <input value={province} onChange={(e) => setProvince(e.target.value)} list="province-list" placeholder="จังหวัด"
          className={`${inp} w-36 text-[13px] text-[#5A6B82]`} />
        {code.trim() && <span className="text-[11px] text-[#5A6B82] bg-[#F0F4F9] rounded-md px-2 py-0.5 shrink-0">HCODE {code.trim()}</span>}
        {item.contacts.length > 0 && <span className="text-[11px] text-[#5A6B82] shrink-0">👤 {item.contacts.length}</span>}
        <span className="text-[11.5px] text-[#A8A29E] tnum w-16 text-right shrink-0">{item.jobCount > 0 ? `${nf.format(item.jobCount)} งาน` : '—'}</span>
        {dirty && (
          <button onClick={save} disabled={saving}
            className="bg-[var(--brand)] text-white text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[var(--brand-strong)] disabled:opacity-60 shrink-0">
            {saving ? '…' : 'บันทึก'}
          </button>
        )}
        <button onClick={del} disabled={item.jobCount > 0}
          title={item.jobCount > 0 ? 'ลบไม่ได้ — มีงานอ้างอิงอยู่' : 'ลบ'}
          className="w-7 h-7 shrink-0 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4] disabled:text-[#D8D3CE] disabled:hover:bg-transparent">✕</button>
        {msg && <span className="text-[11.5px] text-[#C13540] w-full">{msg}</span>}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-[#FBFCFE] border-t border-[#F1F3F6] flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">รหัสสถานพยาบาล (HCODE)</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น 10670" className={fld} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">ที่อยู่โรงพยาบาล</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
                className={`${fld} resize-y`} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[#5A6B82]">ผู้ติดต่อ ({contacts.length})</label>
              <button onClick={() => setContacts((c) => [...c, emptyContact()])}
                className="text-[12px] font-semibold text-[var(--brand)] hover:underline">＋ เพิ่มผู้ติดต่อ</button>
            </div>
            {contacts.length === 0 && <div className="text-[12px] text-[#96A2B5] border border-dashed border-[#DCE4EE] rounded-lg px-3 py-3 text-center">ยังไม่มีผู้ติดต่อ — กด “＋ เพิ่มผู้ติดต่อ” เพื่อกรอกภายหลัง</div>}
            <div className="flex flex-col gap-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex gap-2 flex-wrap items-start bg-white border border-[#EBEFF5] rounded-xl p-2.5">
                  <input value={c.name} onChange={(e) => setC(i, 'name', e.target.value)} placeholder="ชื่อผู้ติดต่อ"
                    className="flex-1 min-w-[140px] border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--brand)]" />
                  <input value={c.position} onChange={(e) => setC(i, 'position', e.target.value)} placeholder="ตำแหน่ง/แผนก"
                    className="w-40 border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--brand)]" />
                  <input value={c.phone} onChange={(e) => setC(i, 'phone', e.target.value)} placeholder="เบอร์โทร"
                    className="w-36 border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--brand)]" />
                  <input value={c.note} onChange={(e) => setC(i, 'note', e.target.value)} placeholder="หมายเหตุ"
                    className="flex-1 min-w-[120px] border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--brand)]" />
                  <button onClick={() => setContacts((cs) => cs.filter((_, x) => x !== i))} title="ลบผู้ติดต่อ"
                    className="w-8 h-8 shrink-0 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving || !dirty}
              className="bg-[var(--brand)] text-white text-[13px] font-semibold rounded-lg px-4 py-2 hover:bg-[var(--brand-strong)] disabled:opacity-50">
              {saving ? 'กำลังบันทึก…' : dirty ? 'บันทึกรายละเอียด' : 'บันทึกแล้ว'}
            </button>
            {msg && <span className="text-[12px] text-[#C13540]">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
