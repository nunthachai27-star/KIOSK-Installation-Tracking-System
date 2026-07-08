'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: string; label: string; active: boolean }

export function ProductChecklistManager({ productType, initial }: { productType: string; initial: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  async function add() {
    const label = newValue.trim()
    if (!label) return
    setAdding(true); setErr('')
    try {
      const res = await fetch('/api/settings/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, label }),
      })
      if (!res.ok) { setErr(res.status === 409 ? 'มีรายการนี้อยู่แล้ว' : 'เพิ่มไม่สำเร็จ'); return }
      const created = await res.json()
      setItems((x) => [...x, { id: created.id, label: created.label, active: created.active }])
      setNewValue('')
      router.refresh()
    } finally { setAdding(false) }
  }

  async function patch(id: string, body: { label?: string; active?: boolean }) {
    const res = await fetch(`/api/settings/checklist/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { setErr(res.status === 409 ? 'ชื่อซ้ำกับรายการอื่น' : 'บันทึกไม่สำเร็จ'); return false }
    const upd = await res.json()
    setItems((x) => x.map((it) => (it.id === id ? { ...it, label: upd.label, active: upd.active } : it)))
    router.refresh()
    return true
  }

  async function remove(id: string) {
    const res = await fetch(`/api/settings/checklist/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  async function saveEdit(id: string) {
    if (await patch(id, { label: editValue })) setEditId(null)
  }

  return (
    <div className="ds-card overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-[#EEF2F8]">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="เพิ่มรายการตรวจสอบ…"
          className="flex-1 border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
        />
        <button onClick={add} disabled={adding}
          className="ds-hover bg-[#EA580C] text-white font-semibold rounded-xl px-5 hover:bg-[#C2410C] disabled:opacity-60">
          {adding ? 'กำลังเพิ่ม…' : 'เพิ่ม'}
        </button>
      </div>
      {err && <div className="px-4 py-2 text-sm text-[#C13540]">{err}</div>}

      {items.length === 0 && <div className="px-4 py-6 text-sm text-[#8492A6]">ยังไม่มีรายการ (ใช้ค่าเริ่มต้น)</div>}
      {items.map((it) => (
        <div key={it.id} className="ds-hover flex items-center gap-3 px-4 py-2.5 border-t border-[#EEF2F8] hover:bg-[#F8FAFD]">
          {editId === it.id ? (
            <>
              <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it.id) }}
                className="flex-1 border border-[#D6DFEA] rounded-lg px-3 py-1.5 outline-none focus:border-[#EA580C]" autoFocus />
              <button onClick={() => saveEdit(it.id)} className="text-[13px] font-semibold text-[#EA580C]">บันทึก</button>
              <button onClick={() => setEditId(null)} className="text-[13px] text-[#8492A6]">ยกเลิก</button>
            </>
          ) : (
            <>
              <span className={`flex-1 text-sm ${it.active ? 'text-[#1C1917]' : 'text-[#A2AEC0] line-through'}`}>{it.label}</span>
              <button onClick={() => { setEditId(it.id); setEditValue(it.label) }} className="text-[13px] text-[#5A6B82] hover:text-[#EA580C]">แก้ไข</button>
              <button onClick={() => patch(it.id, { active: !it.active })}
                className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${it.active ? 'bg-[#E2F3EA] text-[#157F4C]' : 'bg-[#EEF1F5] text-[#8492A6]'}`}>
                {it.active ? 'เปิดใช้งาน' : 'ปิด'}
              </button>
              <button onClick={() => remove(it.id)} className="text-[13px] text-[#C13540] hover:underline">ลบ</button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
