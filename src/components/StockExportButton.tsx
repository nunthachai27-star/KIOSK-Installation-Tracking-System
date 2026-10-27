'use client'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroupSummary } from '@/lib/stock-shared'
import { alertDialog } from '@/lib/dialog'

// เลือกสินค้าในคลังที่ต้องการ แล้วดาวน์โหลดสรุปคงเหลือเป็น Excel (.xlsx) — อ่านอย่างเดียว
export function StockExportButton({ groups }: { groups: GroupSummary[] }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [lots, setLots] = useState(true)
  const [serials, setSerials] = useState(false)
  const [busy, setBusy] = useState(false)

  const all = useMemo(() => groups.flatMap((g) => g.products), [groups])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return groups
      .map((g) => ({ group: g.group, products: s ? g.products.filter((p) => `${g.group} ${p.name}`.toLowerCase().includes(s)) : g.products }))
      .filter((g) => g.products.length)
  }, [groups, q])

  function toggle(ids: string[], on: boolean) {
    setSel((prev) => {
      const next = new Set(prev)
      for (const id of ids) { if (on) next.add(id); else next.delete(id) }
      return next
    })
  }

  async function download() {
    if (!sel.size) return
    setBusy(true)
    try {
      const r = await fetch('/api/stock/export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [...sel], lots, serials }),
      })
      if (!r.ok) { const d = await r.json().catch(() => null); await alertDialog(d?.message || 'ดาวน์โหลดไม่สำเร็จ'); return }
      const blob = await r.blob()
      const cd = r.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename\*=UTF-8''([^;]+)/)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = m ? decodeURIComponent(m[1]) : 'stock.xlsx'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally { setBusy(false) }
  }

  const selRemaining = all.filter((p) => sel.has(p.id)).reduce((s, p) => s + p.remaining, 0)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="ds-hover inline-flex items-center gap-1.5 bg-white border border-[#DCE4EE] text-[#3C4A5E] text-sm font-semibold rounded-lg px-3.5 py-2.5 hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3v10M6 9l4 4 4-4" /><path d="M3 15v2h14v-2" /></svg>
        Export Excel
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-10 bg-[rgba(15,22,33,0.5)] backdrop-blur-[3px]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-[0_12px_44px_rgba(18,26,40,0.2)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF0F3] flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#1C1917]">📥 Export สรุปคงเหลือเป็น Excel</span>
              <button onClick={() => setOpen(false)} className="ml-auto w-8 h-8 grid place-items-center rounded-lg bg-[#F4F6F9] text-[#8492A6] hover:bg-[#E7EBF0] hover:text-[#3C4A5E]">✕</button>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสินค้า / กลุ่ม…"
                  className="flex-1 min-w-[160px] text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--brand)]" />
                <button onClick={() => toggle(all.map((p) => p.id), true)} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">เลือกทั้งหมด</button>
                <button onClick={() => setSel(new Set(all.filter((p) => p.remaining > 0).map((p) => p.id)))} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">เฉพาะที่มีคงเหลือ</button>
                <button onClick={() => setSel(new Set())} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#DCE4EE] text-[#8492A6] hover:text-[#C13540]">ล้าง</button>
              </div>

              <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-[#ECEAE6]">
                {shown.map((g) => {
                  const ids = g.products.map((p) => p.id)
                  const n = ids.filter((id) => sel.has(id)).length
                  return (
                    <div key={g.group} className="border-b border-[#F1EEEA] last:border-b-0">
                      <label className="flex items-center gap-2 px-3 py-2 bg-[#FAF9F7] cursor-pointer sticky top-0">
                        <input type="checkbox" checked={n === ids.length} ref={(el) => { if (el) el.indeterminate = n > 0 && n < ids.length }}
                          onChange={(e) => toggle(ids, e.target.checked)} className="accent-[var(--brand)]" />
                        <span className="text-[12.5px] font-bold text-[#3C4A5E]">{g.group}</span>
                        <span className="text-[11px] text-[#96A2B5]">{n}/{ids.length}</span>
                      </label>
                      {g.products.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 cursor-pointer hover:bg-[#F6F9FC]">
                          <input type="checkbox" checked={sel.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} className="accent-[var(--brand)]" />
                          <span className="text-[12.5px] text-[#233047] flex-1 min-w-0 truncate">{p.name}</span>
                          <span className={`text-[12px] font-semibold ${p.remaining <= 0 ? 'text-[#C13540]' : 'text-[#157F4C]'}`}>คงเหลือ {p.remaining} {p.unit}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
                {shown.length === 0 && <div className="py-8 text-center text-[#96A2B5] text-[13px]">ไม่พบสินค้า</div>}
              </div>

              <div className="text-[12.5px] font-semibold text-[#5A6B82] mt-4 mb-1.5">รูปแบบไฟล์</div>
              <label className="flex items-center gap-2 py-1 cursor-pointer text-[12.5px] text-[#233047]">
                <input type="checkbox" checked={lots} onChange={(e) => setLots(e.target.checked)} className="accent-[var(--brand)]" />
                แยกยอดตาม Lot
              </label>
              <label className="flex items-center gap-2 py-1 cursor-pointer text-[12.5px] text-[#233047]">
                <input type="checkbox" checked={serials} onChange={(e) => setSerials(e.target.checked)} className="accent-[var(--brand)]" />
                แนบรายการ Serial ที่ยังอยู่ในคลัง (อีกชีต)
              </label>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F1F3F6]">
                <span className="text-[12px] text-[#8492A6]">เลือก {sel.size} รายการ · คงเหลือรวม {selRemaining}</span>
                <button onClick={download} disabled={!sel.size || busy}
                  className="ml-auto bg-[var(--brand)] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {busy ? '⏳ กำลังสร้างไฟล์…' : '⬇ ดาวน์โหลด Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </>
  )
}
