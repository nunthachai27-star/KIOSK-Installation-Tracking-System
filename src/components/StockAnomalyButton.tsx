'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

type Kind = 'PATTERN' | 'DUP_LOT' | 'DUP_SERIAL' | 'MISSING_SERIAL' | 'QTY'
type Anomaly = { kind: Kind; productId: string | null; product: string; lotCode: string | null; count: number; message: string; sample: string | null }
type Report = { checkedProducts: number; checkedItems: number; counts: Record<Kind, number>; anomalies: Anomaly[] }

const KIND_META: Record<Kind, { icon: string; label: string; color: string; bg: string }> = {
  PATTERN:        { icon: '🔤', label: 'Serial ผิดแพทเทิร์น (อาจลงผิดรุ่น)', color: '#B4740E', bg: '#FBF0DC' },
  DUP_LOT:        { icon: '📋', label: 'Lot ซ้ำในรุ่นเดียวกัน',              color: '#7A44C6', bg: '#F0E8FB' },
  DUP_SERIAL:     { icon: '♻️', label: 'Serial ซ้ำ',                        color: '#C13540', bg: '#FBE4E4' },
  MISSING_SERIAL: { icon: '⬜', label: 'ไม่มี Serial',                      color: '#2563C9', bg: '#E4EEFD' },
  QTY:            { icon: '🔢', label: 'จำนวนรับเข้าไม่ตรงกับชิ้นจริง',      color: '#157F4C', bg: '#E1F3E9' },
}
const ORDER: Kind[] = ['PATTERN', 'DUP_LOT', 'DUP_SERIAL', 'MISSING_SERIAL', 'QTY']

export function StockAnomalyButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<Report | null>(null)

  async function run() {
    setOpen(true); setLoading(true); setReport(null)
    try {
      const r = await fetch('/api/stock/anomalies', { cache: 'no-store' })
      if (r.ok) setReport(await r.json())
      else setReport({ checkedProducts: 0, checkedItems: 0, counts: { PATTERN: 0, DUP_LOT: 0, DUP_SERIAL: 0, MISSING_SERIAL: 0, QTY: 0 }, anomalies: [] })
    } finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={run}
        className="ds-hover inline-flex items-center gap-1.5 bg-white border border-[#DCE4EE] text-[#3C4A5E] text-sm font-semibold rounded-lg px-3.5 py-2.5 hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5 17 17" /><path d="M9 6.5v3.2M9 12h.01" /></svg>
        ตรวจสอบความผิดปกติ
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-10 bg-[rgba(15,22,33,0.5)] backdrop-blur-[3px]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-[620px] bg-white rounded-2xl shadow-[0_12px_44px_rgba(18,26,40,0.2)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF0F3] flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#1C1917]">🔎 ตรวจสอบความผิดปกติในคลัง</span>
              <button onClick={() => setOpen(false)} className="ml-auto w-8 h-8 grid place-items-center rounded-lg bg-[#F4F6F9] text-[#8492A6] hover:bg-[#E7EBF0] hover:text-[#3C4A5E]">✕</button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {loading && <div className="py-10 text-center text-[#8492A6] text-sm">⏳ กำลังสแกนคลัง…</div>}

              {!loading && report && (
                <>
                  <div className="text-[12.5px] text-[#8492A6] mb-3">
                    สแกน {report.checkedProducts} รุ่น · {report.checkedItems} ชิ้น
                  </div>

                  {report.anomalies.length === 0 ? (
                    <div className="rounded-xl border border-[#DDF0E5] bg-[#F1FAF5] p-6 text-center">
                      <div className="text-[26px] mb-1">✅</div>
                      <div className="text-[14px] font-bold text-[#157F4C]">ไม่พบความผิดปกติ</div>
                      <div className="text-[12.5px] text-[#8492A6] mt-0.5">ข้อมูลคลังเรียบร้อยดี</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {ORDER.filter((k) => report.counts[k] > 0).map((k) => (
                          <span key={k} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ color: KIND_META[k].color, background: KIND_META[k].bg }}>
                            {KIND_META[k].icon} {KIND_META[k].label} · {report.counts[k]}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4">
                        {ORDER.filter((k) => report.counts[k] > 0).map((k) => (
                          <div key={k}>
                            <div className="text-[13px] font-bold text-[#1C1917] mb-1.5">{KIND_META[k].icon} {KIND_META[k].label}</div>
                            <ul className="flex flex-col gap-1.5">
                              {report.anomalies.filter((a) => a.kind === k).map((a, i) => (
                                <li key={i} className="flex items-start gap-2 rounded-lg border border-[#EEEAE6] bg-[#FBFAF8] px-3 py-2">
                                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: KIND_META[k].color }} />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[12.5px] font-semibold text-[#3C4A5E]">{a.product}</div>
                                    <div className="text-[12.5px] text-[#5A6B82] mt-0.5">{a.message}</div>
                                  </div>
                                  {a.productId && (
                                    <Link href={`/stock/${a.productId}`} onClick={() => setOpen(false)}
                                      className="shrink-0 text-[11.5px] font-semibold text-[var(--brand)] border border-[#DCE4EE] rounded-md px-2.5 py-1 hover:border-[var(--brand)]">ดู →</Link>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11.5px] text-[#96A2B5] mt-4 pt-3 border-t border-[#F1F3F6]">
                        🔒 หน้านี้ตรวจสอบอย่างเดียว — ไม่ย้าย/แก้ให้อัตโนมัติ กด “ดู →” เพื่อไปแก้เอง หรือแจ้งทีมพัฒนาให้ช่วย
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>, document.body)}
    </>
  )
}
