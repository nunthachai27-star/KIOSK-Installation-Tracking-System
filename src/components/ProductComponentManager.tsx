'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: string; name: string; quantity: number; needsSerial: boolean }

export function ProductComponentManager({ productType, initial }: { productType: string; initial: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    const nm = name.trim()
    if (!nm) return
    setAdding(true); setErr('')
    try {
      const res = await fetch('/api/settings/components', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, name: nm, quantity: Number(qty) || 1, needsSerial: true }),
      })
      if (!res.ok) { setErr(res.status === 409 ? 'มีรายการนี้อยู่แล้ว' : 'เพิ่มไม่สำเร็จ'); return }
      const c = await res.json()
      setItems((x) => [...x, { id: c.id, name: c.name, quantity: c.quantity, needsSerial: c.needsSerial }])
      setName(''); setQty('1')
      router.refresh()
    } finally { setAdding(false) }
  }

  async function patch(id: string, body: Partial<Pick<Item, 'name' | 'quantity' | 'needsSerial'>>) {
    const res = await fetch(`/api/settings/components/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
    const u = await res.json()
    setItems((x) => x.map((it) => (it.id === id ? { ...it, name: u.name, quantity: u.quantity, needsSerial: u.needsSerial } : it)))
    router.refresh()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/settings/components/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  const field = 'border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition'

  return (
    <div className="ds-card overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-[#EEF2F8]">
        <input value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="ชื่ออุปกรณ์ เช่น Tablet" className={`flex-1 ${field}`} />
        <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="จำนวน" className={`w-20 ${field}`} />
        <button onClick={add} disabled={adding}
          className="ds-hover bg-[#EA580C] text-white font-semibold rounded-xl px-5 hover:bg-[#C2410C] disabled:opacity-60">
          {adding ? '…' : 'เพิ่ม'}
        </button>
      </div>
      {err && <div className="px-4 py-2 text-sm text-[#C13540]">{err}</div>}

      {items.length === 0 && <div className="px-4 py-6 text-sm text-[#8492A6]">ยังไม่มีอุปกรณ์</div>}
      {items.map((it) => (
        <div key={it.id} className="ds-hover flex items-center gap-3 px-4 py-2.5 border-t border-[#EEF2F8] hover:bg-[#F8FAFD]">
          <span className="flex-1 text-sm text-[#1C1917]">{it.name} <span className="text-[#8492A6]">×{it.quantity}</span></span>
          <button
            onClick={() => patch(it.id, { needsSerial: !it.needsSerial })}
            className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${it.needsSerial ? 'bg-[#E4EEFF] text-[#1B5FD9]' : 'bg-[#EEF1F5] text-[#8492A6]'}`}
          >
            {it.needsSerial ? 'เก็บ Serial' : 'ไม่เก็บ Serial'}
          </button>
          <button onClick={() => remove(it.id)} className="text-[13px] text-[#C13540] hover:underline">ลบ</button>
        </div>
      ))}
    </div>
  )
}
