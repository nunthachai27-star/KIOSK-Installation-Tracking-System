'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Item = { id: string; value: string; active: boolean }

export function MasterOptionManager({
  category,
  initial,
  configHrefBase,
}: {
  category: string
  initial: Item[]
  // When set, each row links to a per-value config page (used for product types).
  configHrefBase?: string
}) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  async function add() {
    const value = newValue.trim()
    if (!value) return
    setAdding(true); setErr('')
    try {
      const res = await fetch('/api/settings/options', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, value }),
      })
      if (!res.ok) { setErr(res.status === 409 ? 'มีรายการนี้อยู่แล้ว' : 'เพิ่มไม่สำเร็จ'); return }
      const created = await res.json()
      setItems((x) => [...x, { id: created.id, value: created.value, active: created.active }])
      setNewValue('')
      router.refresh()
    } finally { setAdding(false) }
  }

  async function patch(id: string, body: { value?: string; active?: boolean }) {
    const res = await fetch(`/api/settings/options/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { setErr(res.status === 409 ? 'ชื่อซ้ำกับรายการอื่น' : 'บันทึกไม่สำเร็จ'); return false }
    const upd = await res.json()
    setItems((x) => x.map((it) => (it.id === id ? { ...it, value: upd.value, active: upd.active } : it)))
    router.refresh()
    return true
  }

  async function saveEdit(id: string) {
    if (await patch(id, { value: editValue })) setEditId(null)
  }

  return (
    <div className="ds-card overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-[#EEF2F8]">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="เพิ่มรายการใหม่…"
          className="flex-1 border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
        />
        <button onClick={add} disabled={adding}
          className="ds-hover bg-[#EA580C] text-white font-semibold rounded-xl px-5 hover:bg-[#C2410C] disabled:opacity-60">
          {adding ? 'กำลังเพิ่ม…' : 'เพิ่ม'}
        </button>
      </div>
      {err && <div className="px-4 py-2 text-sm text-[#C13540]">{err}</div>}

      <div className="text-[12.5px] text-[#8492A6] px-4 pt-3 pb-1">{items.length} รายการ · {items.filter((i) => i.active).length} เปิดใช้งาน</div>
      {items.length === 0 && <div className="px-4 py-6 text-sm text-[#8492A6]">ยังไม่มีรายการ</div>}
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
              <span className={`flex-1 text-sm ${it.active ? 'text-[#1C1917]' : 'text-[#A2AEC0] line-through'}`}>{it.value}</span>
              {configHrefBase && (
                <Link href={`${configHrefBase}/${encodeURIComponent(it.value)}`} className="text-[13px] font-semibold text-[#EA580C] hover:underline">
                  Checklist/Serial ›
                </Link>
              )}
              <button onClick={() => { setEditId(it.id); setEditValue(it.value) }} className="text-[13px] text-[#5A6B82] hover:text-[#EA580C]">แก้ไข</button>
              <button onClick={() => patch(it.id, { active: !it.active })}
                className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${it.active ? 'bg-[#E2F3EA] text-[#157F4C]' : 'bg-[#EEF1F5] text-[#8492A6]'}`}>
                {it.active ? 'เปิดใช้งาน' : 'ปิด'}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
