'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: string; name: string; province: string; jobCount: number }
const nf = new Intl.NumberFormat('th-TH')
const PER_PAGE = 20

export function HospitalManager({ initial, provinceOptions }: { initial: Item[]; provinceOptions: string[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // add form
  const [newName, setNewName] = useState('')
  const [newProvince, setNewProvince] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const ql = q.trim().toLowerCase()
  const filtered = ql ? items.filter((h) => `${h.name} ${h.province}`.toLowerCase().includes(ql)) : items
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
      {/* add new */}
      <div className="ds-card p-4">
        <div className="text-[13.5px] font-bold text-[#1C1917] mb-2.5">＋ เพิ่มโรงพยาบาลใหม่</div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">ชื่อโรงพยาบาล</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="เช่น โรงพยาบาลบางปะกอก"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#EA580C]" />
          </div>
          <div className="w-48">
            <label className="block text-[12px] font-semibold text-[#5A6B82] mb-1">จังหวัด</label>
            <input value={newProvince} onChange={(e) => setNewProvince(e.target.value)} list="province-list" placeholder="จังหวัด"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#EA580C]" />
          </div>
          <button onClick={addHospital} disabled={adding}
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] disabled:opacity-60">
            {adding ? 'กำลังเพิ่ม…' : 'เพิ่ม'}
          </button>
        </div>
        {err && <div className="text-[12.5px] text-[#C13540] mt-2">{err}</div>}
      </div>

      {/* search */}
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงพยาบาล / จังหวัด…"
          className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]">🔍</span>
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
      </div>

      <div className="text-[12.5px] text-[#8492A6]">ทั้งหมด {nf.format(filtered.length)} โรงพยาบาล{ql ? ` (ค้นหา “${q.trim()}”)` : ''}</div>

      {/* list */}
      <div className="ds-card overflow-hidden">
        {rows.length === 0 && <div className="px-5 py-8 text-sm text-[#8492A6] text-center">ไม่พบโรงพยาบาล</div>}
        {rows.map((h) => (
          <HospitalRow key={h.id} item={h}
            onSaved={(name, province) => setItems((x) => x.map((i) => (i.id === h.id ? { ...i, name, province } : i)))}
            onDeleted={() => setItems((x) => x.filter((i) => i.id !== h.id))}
            refresh={() => router.refresh()} />
        ))}
      </div>

      {/* pagination */}
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
  onSaved: (name: string, province: string) => void; onDeleted: () => void; refresh: () => void
}) {
  const [name, setName] = useState(item.name)
  const [province, setProvince] = useState(item.province)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => { setName(item.name); setProvince(item.province) }, [item.name, item.province])

  const dirty = name.trim() !== item.name || province.trim() !== item.province

  async function save() {
    if (!name.trim()) { setMsg('ชื่อห้ามว่าง'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch(`/api/hospitals/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, province }),
      })
      if (!res.ok) { setMsg('บันทึกไม่สำเร็จ'); return }
      onSaved(name.trim(), province.trim())
      refresh()
    } finally { setSaving(false) }
  }

  async function del() {
    if (item.jobCount > 0) return
    if (!window.confirm(`ลบ "${item.name}" ?`)) return
    const res = await fetch(`/api/hospitals/${item.id}`, { method: 'DELETE' })
    if (res.ok) { onDeleted(); refresh() }
    else setMsg('ลบไม่สำเร็จ')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#F1F3F6] first:border-t-0 hover:bg-[#FBFAF8] flex-wrap">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-[#EEF3FA] text-[#5A6B82] grid place-items-center">🏢</span>
      <input value={name} onChange={(e) => setName(e.target.value)}
        className="flex-1 min-w-[180px] border border-transparent hover:border-[#E1E8F2] focus:border-[#EA580C] rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#1C1917] outline-none" />
      <input value={province} onChange={(e) => setProvince(e.target.value)} list="province-list" placeholder="จังหวัด"
        className="w-40 border border-transparent hover:border-[#E1E8F2] focus:border-[#EA580C] rounded-lg px-2.5 py-1.5 text-[13px] text-[#5A6B82] outline-none" />
      <span className="text-[11.5px] text-[#A8A29E] tnum w-16 text-right shrink-0">{item.jobCount > 0 ? `${nf.format(item.jobCount)} งาน` : '—'}</span>
      {dirty && (
        <button onClick={save} disabled={saving}
          className="bg-[#EA580C] text-white text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#C2410C] disabled:opacity-60 shrink-0">
          {saving ? '…' : 'บันทึก'}
        </button>
      )}
      <button onClick={del} disabled={item.jobCount > 0}
        title={item.jobCount > 0 ? 'ลบไม่ได้ — มีงานอ้างอิงอยู่' : 'ลบ'}
        className="w-7 h-7 shrink-0 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4] disabled:text-[#D8D3CE] disabled:hover:bg-transparent">✕</button>
      {msg && <span className="text-[11.5px] text-[#C13540] w-full">{msg}</span>}
    </div>
  )
}
