'use client'
import { useEffect, useState } from 'react'

type JobHit = { id: string; jobCode: string; productType: string; province: string | null; hospital: { name: string } | null }
const CFG_KEY = 'kioskEquipSetCfg'

export function EquipSetLabel({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<JobHit[]>([])
  const [searching, setSearching] = useState(false)
  const [job, setJob] = useState<JobHit | null>(null)
  const [sns, setSns] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [fs, setFs] = useState(52)
  const [orient, setOrient] = useState<'landscape' | 'portrait'>('landscape')
  const [showSN, setShowSN] = useState(true)
  const [showNo, setShowNo] = useState(true)
  const [msg, setMsg] = useState('')

  // โหลดรูปแบบที่จำไว้
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFG_KEY)
      if (raw) { const c = JSON.parse(raw); if (c.fs) setFs(c.fs); if (c.orient) setOrient(c.orient); if (typeof c.showSN === 'boolean') setShowSN(c.showSN); if (typeof c.showNo === 'boolean') setShowNo(c.showNo) }
    } catch { /* ignore */ }
  }, [])

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    const term = q.trim(); if (!term) return
    setSearching(true)
    try {
      const r = await fetch(`/api/jobs?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
      const list = r.ok ? await r.json() : []
      setResults((Array.isArray(list) ? list : []).slice(0, 12).map((j: { id: string; jobCode: string; productType: string; province?: string | null; hospital?: { name: string } | null }) => ({
        id: j.id, jobCode: j.jobCode, productType: j.productType, province: j.province ?? null, hospital: j.hospital ?? null,
      })))
    } finally { setSearching(false) }
  }

  async function pick(j: JobHit) {
    setJob(j); setResults([]); setQ(j.jobCode); setIdx(0); setSns([])
    try {
      const r = await fetch(`/api/jobs/${j.id}/units`, { cache: 'no-store' })
      const jj = r.ok ? await r.json() : { units: [] }
      setSns((jj.units || []).map((u: { serialNo: string }) => u.serialNo).filter(Boolean))
    } catch { /* ignore */ }
  }

  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify({ fs, orient, showSN, showNo })); setMsg('จำรูปแบบไว้แล้ว') }
    catch { setMsg('บันทึกไม่สำเร็จ') }
    setTimeout(() => setMsg(''), 3000)
  }
  function resetCfg() {
    try { localStorage.removeItem(CFG_KEY) } catch { /* ignore */ }
    setFs(52); setOrient('landscape'); setShowSN(true); setShowNo(true); setMsg('คืนค่าเริ่มต้นแล้ว')
    setTimeout(() => setMsg(''), 3000)
  }

  const units = sns.length ? sns : ['']
  const cur = Math.min(idx, units.length - 1)
  const hosp = job?.hospital?.name || 'รพ.………'
  const prov = job?.province ? (job.province.startsWith('จ.') ? job.province : `จ.${job.province}`) : 'จ.………'
  const type = job?.productType || 'ประเภทสินค้า'
  const snLine = (i: number) => `${showNo ? `เครื่องที่ ${i + 1}` : ''}${showNo && showSN ? ' · ' : ''}${showSN ? `S/N: ${sns[i] || '………'}` : ''}`

  function printAll() {
    const list = sns.length ? sns : []
    if (!job || !list.length) { setMsg('ยังไม่มีเครื่อง (S/N BMS) ในงานนี้'); setTimeout(() => setMsg(''), 3000); return }
    const [pw, ph] = orient === 'landscape' ? ['297mm', '210mm'] : ['210mm', '297mm']
    const pages = list.map((sn, i) => `
      <div class="ps">
        <div class="nm">${hosp}</div>
        <div class="pv">${prov}</div>
        <div class="tp">${type}</div>
        ${(showNo || showSN) ? `<div class="sn">${showNo ? `เครื่องที่ ${i + 1}` : ''}${showNo && showSN ? ' · ' : ''}${showSN ? `S/N: ${sn}` : ''}</div>` : ''}
      </div>`).join('')
    const css = `@page{size:A4 ${orient};margin:0}html,body{margin:0}
      .ps{width:${pw};height:${ph};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm;padding:14mm;box-sizing:border-box;page-break-after:always;font-family:'Sarabun','TH Sarabun New','Leelawadee UI',sans-serif;color:#111}
      .nm{font-weight:700;font-size:${(fs * 0.42).toFixed(1)}mm;line-height:1.15}.pv{font-weight:600;font-size:${(fs * 0.36).toFixed(1)}mm}
      .tp{font-weight:800;font-size:${(fs * 0.46).toFixed(1)}mm;line-height:1.2}.sn{font-weight:700;font-size:${(fs * 0.28).toFixed(1)}mm}`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>จัดชุดอุปกรณ์ ${job.jobCode}</title><style>${css}</style></head><body>${pages}</body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const ifr = document.createElement('iframe')
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    ifr.src = url
    ifr.onload = () => { const w = ifr.contentWindow; if (!w) return; setTimeout(() => { try { w.focus(); w.print() } catch { /* ยกเลิก */ } }, 250); setTimeout(() => { URL.revokeObjectURL(url); ifr.remove() }, 60000) }
    document.body.appendChild(ifr)
  }

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เลือกแบบฟอร์มอื่น</button>
        <span className="text-[#C9D3E0]">/</span>
        <span className="text-[15px] font-bold text-[#233047]">🏷️ จัดชุดอุปกรณ์</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="lg:sticky lg:top-20 self-start space-y-4">
          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">1) เลือกงาน</div>
            <form onSubmit={search} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="เลขสัญญา / PO / รหัสงาน / โรงพยาบาล"
                className="flex-1 text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--brand)]" />
              <button type="submit" disabled={searching} className="text-[13px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">{searching ? '…' : 'ค้นหา'}</button>
            </form>
            {results.length > 0 && !job && (
              <div className="mt-2 border border-[#EEF2F7] rounded-xl divide-y divide-[#F1F4F8] max-h-64 overflow-auto">
                {results.map((h) => (
                  <button key={h.id} type="button" onClick={() => pick(h)} className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC]">
                    <div className="text-[13px] font-semibold text-[#233047]">{h.jobCode} · {h.productType}</div>
                    <div className="text-[11.5px] text-[#8492A6]">{h.hospital?.name ?? '—'}{h.province ? ` · ${h.province}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            {job && (
              <div className="mt-2 bg-[#F1FBF5] border border-[#BFE6CE] rounded-xl px-3 py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-[#157F4C]">✓ {job.jobCode}</div>
                  <div className="text-[11.5px] text-[#5A6B82]">{job.hospital?.name ?? '—'} · {job.productType}</div>
                  <div className="text-[11.5px] text-[#5A6B82] mt-0.5">{sns.length ? `มี ${sns.length} เครื่อง → พิมพ์ ${sns.length} ใบ` : 'ไม่พบ S/N BMS ในงานนี้'}</div>
                </div>
                <button type="button" onClick={() => { setJob(null); setSns([]) }} className="text-[12px] text-[#8492A6] hover:text-[#C13540] font-semibold">เปลี่ยน</button>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-3">
            <div className="text-[13px] font-bold text-[#233047]">2) รูปแบบ</div>
            <div>
              <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ขนาดตัวอักษร</div>
              <input type="range" min={28} max={90} value={fs} onChange={(e) => setFs(+e.target.value)} className="w-full accent-[var(--brand)]" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['landscape', 'portrait'] as const).map((o) => (
                <button key={o} type="button" onClick={() => setOrient(o)}
                  className={`text-[13px] font-semibold px-2 py-2 rounded-lg border ${orient === o ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                  {o === 'landscape' ? '⬌ แนวนอน' : '⬍ แนวตั้ง'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#3C4A5E] cursor-pointer"><input type="checkbox" checked={showSN} onChange={(e) => setShowSN(e.target.checked)} className="accent-[var(--brand)]" /> แสดง S/N BMS</label>
            <label className="flex items-center gap-2 text-[13px] text-[#3C4A5E] cursor-pointer"><input type="checkbox" checked={showNo} onChange={(e) => setShowNo(e.target.checked)} className="accent-[var(--brand)]" /> แสดง “เครื่องที่ N”</label>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#233047]">💾 จำรูปแบบ</div>
            <div className="flex gap-2">
              <button type="button" onClick={saveCfg} className="flex-1 text-[13px] font-semibold px-3 py-2 rounded-lg bg-[#3C4A5E] text-white hover:bg-[#2C3646]">💾 จำรูปแบบ</button>
              <button type="button" onClick={resetCfg} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#5A6B82] hover:border-[#C13540] hover:text-[#C13540]">↺ คืนค่า</button>
            </div>
            {msg && <div className="text-[11.5px] text-[var(--brand)] font-semibold">{msg}</div>}
          </div>

          <button type="button" onClick={printAll}
            className="w-full text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E]">🖨️ พิมพ์ทั้งหมด{sns.length ? ` (${sns.length} ใบ)` : ''}</button>
        </div>

        <div>
          <div className="flex items-center justify-center gap-3 text-[13px] text-[#8492A6] mb-2">
            <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={cur === 0} className="w-8 h-8 rounded-lg border border-[#DCE4EE] bg-white disabled:opacity-40">‹</button>
            <span>ใบที่ {cur + 1} / {units.length}</span>
            <button type="button" onClick={() => setIdx((i) => Math.min(units.length - 1, i + 1))} disabled={cur >= units.length - 1} className="w-8 h-8 rounded-lg border border-[#DCE4EE] bg-white disabled:opacity-40">›</button>
          </div>
          <div className="bg-[#EEF1F5] rounded-2xl p-4 flex justify-center overflow-auto">
            <div style={{
              background: '#fff', color: '#111', border: '1px solid #cfcfcf', boxShadow: '0 14px 40px -18px rgba(0,0,0,.45)',
              aspectRatio: orient === 'landscape' ? '297 / 210' : '210 / 297', width: orient === 'landscape' ? 'min(760px,95%)' : 'min(538px,80%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6% 8%', gap: '4%',
              fontFamily: "'Sarabun','Leelawadee UI',sans-serif",
            }}>
              <div style={{ fontWeight: 700, lineHeight: 1.15, fontSize: fs * 1.15 }}>{hosp}</div>
              <div style={{ fontWeight: 600, lineHeight: 1.15, fontSize: fs }}>{prov}</div>
              <div style={{ fontWeight: 800, lineHeight: 1.2, fontSize: fs * 1.25 }}>{type}</div>
              {(showNo || showSN) && <div style={{ fontWeight: 700, lineHeight: 1.2, fontSize: fs * 0.8, marginTop: '1%' }}>{snLine(cur)}</div>}
            </div>
          </div>
          <div className="text-[12px] text-[#8492A6] text-center mt-2">A4 {orient === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} · 1 ใบต่อ 1 เครื่อง</div>
        </div>
      </div>
    </div>
  )
}
