'use client'
import { useEffect, useState } from 'react'

type Item = {
  id: string; source: string; detail: string; name: string | null; phone: string | null
  wantCallback: boolean; createdAt: string; handledAt: string | null
}

const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

// รายการแจ้งปัญหา/คำแนะนำ (เจ้าหน้าที่เท่านั้น — ถ้าไม่มีสิทธิ์จะไม่แสดง)
export function FeedbackList({ source }: { source?: 'fat' | 'bp' | 'other' }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const q = source ? `?source=${source}` : ''
    const r = await fetch(`/api/feedback${q}`, { cache: 'no-store' }).catch(() => null)
    if (!r || !r.ok) { setItems([]); return }
    const j = await r.json()
    setItems(j.items ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(it: Item) {
    const handled = !it.handledAt
    const r = await fetch(`/api/feedback/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handled }) })
    if (r.ok) { const j = await r.json(); setItems((x) => (x ?? []).map((i) => (i.id === it.id ? { ...i, handledAt: j.handledAt } : i))) }
  }

  if (!items || items.length === 0) return null
  const unhandled = items.filter((i) => !i.handledAt).length

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12.5px] font-bold text-[#5A6B82] hover:text-[var(--brand)]">
        {open ? '▾' : '▸'} รายการที่แจ้งเข้ามา ({items.length}{unhandled ? ` · ใหม่ ${unhandled}` : ''})
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5 max-h-[320px] overflow-auto">
          {items.map((it) => (
            <div key={it.id} className={`text-[12.5px] border rounded-lg px-3 py-2 ${it.handledAt ? 'bg-[#FAFAFA] border-[#EEF2F8] opacity-70' : 'bg-white border-[#E7EDF4]'}`}>
              <div className="whitespace-pre-wrap break-words text-[#1C1917]">{it.detail}</div>
              <div className="flex items-center gap-2 flex-wrap mt-1 text-[11.5px] text-[#8492A6]">
                <span>{it.name || 'ไม่ระบุชื่อ'}</span>
                {it.phone && <span>· ☎️ {it.phone}</span>}
                {it.wantCallback && <span className="text-[#B45309] font-semibold">· ขอให้ติดต่อกลับ</span>}
                <span>· {fmt(it.createdAt)}</span>
                <button type="button" onClick={() => toggle(it)}
                  className={`ml-auto font-semibold px-2 py-0.5 rounded ${it.handledAt ? 'text-[#8492A6]' : 'text-[#157F4C] hover:bg-[#EAF7EF]'}`}>
                  {it.handledAt ? '✓ จัดการแล้ว (ยกเลิก)' : 'ทำเครื่องหมายจัดการแล้ว'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
