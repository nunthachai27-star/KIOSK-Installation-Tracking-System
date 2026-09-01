'use client'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type ProductLite = { id: string; group: string; name: string; inStock: number }
type Comp = {
  id: string; name: string; quantity: number; needsSerial: boolean
  stockProductId: string | null; stockProductName: string | null; group: string | null; inStock: number | null
  suggestions: ProductLite[]
}
type Report = { productType: string; components: Comp[]; totalInStock: number; mappedCount: number }
type Payload = { productTypes: string[]; products: ProductLite[]; report: Report | null }

export function StockReportButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<string[]>([])
  const [products, setProducts] = useState<ProductLite[]>([])
  const [sel, setSel] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function openModal() {
    setOpen(true)
    if (types.length) return
    setLoading(true)
    try {
      const r = await fetch('/api/stock/report', { cache: 'no-store' })
      if (r.ok) { const j: Payload = await r.json(); setTypes(j.productTypes); setProducts(j.products) }
    } finally { setLoading(false) }
  }

  async function loadReport(pt: string) {
    setSel(pt); setReport(null)
    if (!pt) return
    setLoading(true)
    try {
      const r = await fetch(`/api/stock/report?productType=${encodeURIComponent(pt)}`, { cache: 'no-store' })
      if (r.ok) { const j: Payload = await r.json(); setReport(j.report); if (j.products?.length) setProducts(j.products) }
    } finally { setLoading(false) }
  }

  async function setMap(componentId: string, stockProductId: string) {
    setSavingId(componentId)
    try {
      await fetch('/api/stock/report/map', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId, stockProductId }),
      })
      await loadReport(sel)
    } finally { setSavingId(null) }
  }

  // ตัวเลือกสินค้าในคลัง จัดกลุ่มตาม group
  const grouped = useMemo(() => {
    const m = new Map<string, ProductLite[]>()
    for (const p of products) { (m.get(p.group) ?? m.set(p.group, []).get(p.group)!).push(p) }
    return [...m.entries()]
  }, [products])

  return (
    <>
      <button onClick={openModal}
        className="ds-hover inline-flex items-center gap-1.5 bg-white border border-[#DCE4EE] text-[#3C4A5E] text-sm font-semibold rounded-lg px-3.5 py-2.5 hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 16V9M9 16V5M14 16v-6" /><path d="M3 17h14" /></svg>
        รายงานคงเหลือตามประเภท
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-10 bg-[rgba(15,22,33,0.5)] backdrop-blur-[3px]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-[760px] bg-white rounded-2xl shadow-[0_12px_44px_rgba(18,26,40,0.2)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF0F3] flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#1C1917]">📊 รายงานคงเหลือตามประเภทสินค้า</span>
              <button onClick={() => setOpen(false)} className="ml-auto w-8 h-8 grid place-items-center rounded-lg bg-[#F4F6F9] text-[#8492A6] hover:bg-[#E7EBF0] hover:text-[#3C4A5E]">✕</button>
            </div>

            <div className="p-5 max-h-[74vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[12.5px] font-semibold text-[#5A6B82] shrink-0">ประเภทสินค้า:</span>
                <select value={sel} onChange={(e) => loadReport(e.target.value)}
                  className="flex-1 text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[var(--brand)]">
                  <option value="">— เลือกประเภทสินค้า —</option>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {loading && <div className="py-10 text-center text-[#8492A6] text-sm">⏳ กำลังโหลด…</div>}

              {!loading && report && (
                <>
                  <div className="flex flex-wrap gap-2 mb-3 text-[12px]">
                    <span className="font-bold px-2.5 py-1 rounded-full bg-[#E1F3E9] text-[#157F4C]">รวมคงเหลือ (ที่ผูกแล้ว) · {report.totalInStock} ชิ้น</span>
                    <span className="font-semibold px-2.5 py-1 rounded-full bg-[#EEF3FA] text-[#3C4A5E]">ผูกแล้ว {report.mappedCount}/{report.components.length} อุปกรณ์</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#ECEAE6]">
                    <table className="w-full text-[12.5px] border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F7] text-[#5A6B82]">
                          <th className="text-left font-semibold px-3 py-2">อุปกรณ์ที่ต้องใช้</th>
                          <th className="text-center font-semibold px-2 py-2 w-[52px]">ต่อชุด</th>
                          <th className="text-left font-semibold px-3 py-2">สินค้าในคลัง (ที่ผูก)</th>
                          <th className="text-center font-semibold px-2 py-2 w-[90px]">คงเหลือ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.components.map((c) => (
                          <tr key={c.id} className="border-t border-[#F1EEEA] align-top">
                            <td className="px-3 py-2 font-semibold text-[#3C4A5E]">{c.name}</td>
                            <td className="px-2 py-2 text-center text-[#8492A6]">{c.quantity}</td>
                            <td className="px-3 py-2">
                              {c.stockProductId ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[#233047]">{c.group ? `${c.group} · ` : ''}{c.stockProductName}</span>
                                  <button onClick={() => setMap(c.id, '')} disabled={savingId === c.id}
                                    className="text-[11px] text-[#96A2B5] hover:text-[#C13540] underline">เปลี่ยน/ยกเลิก</button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {c.suggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {c.suggestions.map((s) => (
                                        <button key={s.id} onClick={() => setMap(c.id, s.id)} disabled={savingId === c.id}
                                          className="text-[11px] px-2 py-0.5 rounded-full border border-[#CDE3D6] bg-[#F1FAF5] text-[#157F4C] hover:border-[#157F4C]"
                                          title={`${s.group} · คงเหลือ ${s.inStock}`}>
                                          + {s.name} ({s.inStock})
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <select value="" disabled={savingId === c.id} onChange={(e) => e.target.value && setMap(c.id, e.target.value)}
                                    className="text-[12px] border border-[#DCE4EE] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[var(--brand)]">
                                    <option value="">— เลือกสินค้าในคลังเพื่อผูก —</option>
                                    {grouped.map(([g, list]) => (
                                      <optgroup key={g} label={g}>
                                        {list.map((p) => <option key={p.id} value={p.id}>{p.name} (คงเหลือ {p.inStock})</option>)}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {c.inStock === null
                                ? <span className="text-[#B98900] font-semibold">ยังไม่ผูก</span>
                                : <span className={`font-bold ${c.inStock <= 0 ? 'text-[#C13540]' : 'text-[#157F4C]'}`}>{c.inStock}</span>}
                            </td>
                          </tr>
                        ))}
                        {report.components.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-6 text-center text-[#96A2B5]">ประเภทนี้ยังไม่มีรายการอุปกรณ์ (BOM)</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11.5px] text-[#96A2B5] mt-3 pt-3 border-t border-[#F1F3F6] leading-relaxed">
                    🔒 รายงานนี้อ่านอย่างเดียว — ไม่ตัด/ไม่แก้สต็อก · “คงเหลือ” นับเฉพาะสถานะ IN_STOCK ของสินค้าที่ผูกไว้ · การผูกอุปกรณ์กับสินค้าในคลังใช้กับรายงานนี้เท่านั้น ไม่กระทบการตัดจ่าย/QC
                  </div>
                </>
              )}

              {!loading && !report && sel === '' && (
                <div className="py-8 text-center text-[#96A2B5] text-[13px]">เลือกประเภทสินค้าด้านบนเพื่อดูรายงานคงเหลือของอุปกรณ์แต่ละตัว</div>
              )}
            </div>
          </div>
        </div>, document.body)}
    </>
  )
}
