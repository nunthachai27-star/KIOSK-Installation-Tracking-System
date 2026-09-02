'use client'
import { useEffect, useRef, useState } from 'react'
import { BMS_LOGO_DATA_URL } from '@/lib/bmsLogo'

type Contact = { name: string; phone: string | null; position: string | null }
type Hosp = { id: string; name: string; province: string; code: string | null; address: string | null; contacts: Contact[] }

// สไตล์ของป้าย (หน่วย mm = ขนาดจริงบนกระดาษ) — ใช้ทั้งพรีวิวและตอนพิมพ์
const LABEL_CSS = `
.sl-label{background:#fff;color:#111;border:2px solid #111;border-radius:6px;display:flex;flex-direction:column;
  padding:5mm;font-family:'Sarabun','TH Sarabun New','Leelawadee UI',sans-serif;box-sizing:border-box;overflow:hidden}
.sl-from{display:flex;gap:3mm;align-items:center;border-bottom:1.5px dashed #999;padding-bottom:3mm;margin-bottom:3mm}
.sl-logo{width:14mm;height:14mm;object-fit:contain;flex:0 0 auto}
.sl-fromtxt{font-size:2.9mm;line-height:1.35;color:#222}
.sl-to{flex:1;display:flex;flex-direction:column;gap:2mm;min-height:0}
.sl-tag{font-size:3mm;font-weight:800;color:#fff;background:#111;align-self:flex-start;padding:.6mm 3mm;border-radius:3px;letter-spacing:.05em}
.sl-name{font-size:6.5mm;font-weight:800;line-height:1.15}
.sl-addr{font-size:4.2mm;line-height:1.45}
.sl-contact{font-size:4.2mm;font-weight:700;margin-top:auto}
.sl-phone{font-size:5.2mm}
.sl-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:6px;border-top:1.5px dashed #999;padding-top:2.5mm;margin-top:3mm}
.sl-box{font-size:3.4mm;font-weight:700}
.sl-fragile{border:2px solid #C0271F;color:#C0271F;font-weight:800;font-size:3.6mm;padding:1mm 3mm;border-radius:4px;transform:rotate(-2deg)}
`

function labelHtml(): string {
  const ed = 'contenteditable="true"'
  return `
  <div class="sl-label">
    <div class="sl-from">
      <img class="sl-logo" src="${BMS_LOGO_DATA_URL}" alt="BMS" />
      <div class="sl-fromtxt" ${ed}>บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)<br>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร 10140<br>โทร. 0-2427-9991</div>
    </div>
    <div class="sl-to">
      <span class="sl-tag">ผู้รับ · TO</span>
      <div class="sl-name" ${ed}>โรงพยาบาล………………………</div>
      <div class="sl-addr" ${ed}>ที่อยู่……………………………………………………………………………</div>
      <div class="sl-contact"><span class="sl-cname" ${ed}>ผู้ติดต่อ ………………</span>&nbsp;&nbsp;โทร. <span class="sl-phone" ${ed}>…………………</span></div>
    </div>
    <div class="sl-foot">
      <div class="sl-box">กล่อง <b class="sl-boxes">1</b> กล่อง<span class="sl-boxnowrap" style="display:none"> · ที่ <b class="sl-boxno"></b></span></div>
      <div class="sl-fragile">⚠ ระวังแตก · ห้ามโยน</div>
    </div>
  </div>`
}

const CM = 37.8 // px ต่อ 1 ซม. (96dpi)
const SIZES: Record<string, [number, number]> = {
  a6: [10.5, 14.8], a5: [14.8, 21], a4: [21, 29.7], s1015: [10, 15], l46: [10.16, 15.24],
}

export function ShipLabel({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Hosp[]>([])
  const [searching, setSearching] = useState(false)
  const [sizeKey, setSizeKey] = useState('a6')
  const [cw, setCw] = useState(10)
  const [ch, setCh] = useState(15)
  const [orient, setOrient] = useState<'portrait' | 'landscape'>('portrait')
  const [fragile, setFragile] = useState(true)
  const [showFrom, setShowFrom] = useState(true)
  const [boxes, setBoxes] = useState('1')
  const [boxno, setBoxno] = useState('')
  const [meta, setMeta] = useState('')
  const [layout, setLayout] = useState(false)
  const [savedExists, setSavedExists] = useState(false)
  const [reload, setReload] = useState(0)
  const [msg, setMsg] = useState('')
  const fit = useRef<HTMLDivElement>(null)
  const scaler = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const selRef = useRef<HTMLElement | null>(null)

  // วางป้ายลง DOM — ใช้รูปแบบที่จำไว้ถ้ามี (ช่องแก้ได้ไม่โดน React รีเซ็ต)
  useEffect(() => {
    if (!scaler.current) return
    let html: string | null = null
    try {
      html = localStorage.getItem('kioskShipLabelHtml')
      const raw = localStorage.getItem('kioskShipLabelCfg')
      if (raw) {
        const c = JSON.parse(raw)
        if (c.sizeKey) setSizeKey(c.sizeKey)
        if (c.cw != null) setCw(c.cw)
        if (c.ch != null) setCh(c.ch)
        if (c.orient) setOrient(c.orient)
        if (typeof c.fragile === 'boolean') setFragile(c.fragile)
        if (typeof c.showFrom === 'boolean') setShowFrom(c.showFrom)
        if (c.boxes != null) setBoxes(c.boxes)
        if (c.boxno != null) setBoxno(c.boxno)
      }
    } catch { /* ignore */ }
    scaler.current.innerHTML = html || labelHtml()
    setSavedExists(!!html)
  }, [reload])

  function dims(): [number, number] {
    let [w, h] = sizeKey === 'custom' ? [cw || 10, ch || 15] : SIZES[sizeKey]
    if (orient === 'landscape' && w < h) [w, h] = [h, w]
    if (orient === 'portrait' && w > h) [w, h] = [h, w]
    return [w, h]
  }

  // ขนาด/แนว → ตั้งขนาดป้าย (ซม.จริง) แล้วย่อให้พอดีพื้นที่พรีวิว
  useEffect(() => {
    const s = scaler.current, f = fit.current
    const label = s?.querySelector('.sl-label') as HTMLElement | null
    if (!s || !f || !label) return
    const [w, h] = dims()
    label.style.width = w + 'cm'; label.style.height = h + 'cm'
    const avail = f.clientWidth - 8
    const sc = Math.min(avail / (w * CM), 520 / (h * CM), 1.5)
    s.style.transformOrigin = 'top center'; s.style.transform = `scale(${sc})`
    f.style.height = h * CM * sc + 'px'
    scaleRef.current = sc
    setMeta(`${w.toFixed(1)} × ${h.toFixed(1)} ซม. · ${orient === 'portrait' ? 'แนวตั้ง' : 'แนวนอน'}`)
  }, [sizeKey, cw, ch, orient])

  // โหมดจัดวาง: คลิกเลือก + ลากย้ายอิสระ (ปิดการพิมพ์แก้ชั่วคราว)
  const DRAG_SEL = '.sl-fromtxt,.sl-logo,.sl-name,.sl-addr,.sl-contact,.sl-box,.sl-fragile,.sl-tag'
  useEffect(() => {
    const s = scaler.current
    const label = s?.querySelector('.sl-label') as HTMLElement | null
    if (!s || !label || !layout) return
    const editables = Array.from(label.querySelectorAll('[contenteditable="true"]')) as HTMLElement[]
    editables.forEach((e) => e.setAttribute('contenteditable', 'false'))
    const drags = Array.from(label.querySelectorAll(DRAG_SEL)) as HTMLElement[]
    drags.forEach((e) => e.classList.add('sl-drag'))
    const select = (el: HTMLElement) => { label.querySelectorAll('.sl-sel').forEach((n) => n.classList.remove('sl-sel')); el.classList.add('sl-sel'); selRef.current = el }
    const onDown = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest('.sl-drag') as HTMLElement | null
      if (!t) return
      select(t)
      const sc = scaleRef.current || 1
      const sx = e.clientX, sy = e.clientY
      const bx = parseFloat(t.dataset.dx || '0'), by = parseFloat(t.dataset.dy || '0')
      const move = (ev: PointerEvent) => {
        const nx = bx + (ev.clientX - sx) / sc, ny = by + (ev.clientY - sy) / sc
        t.dataset.dx = String(nx); t.dataset.dy = String(ny); t.style.translate = `${nx}px ${ny}px`
      }
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
      e.preventDefault()
    }
    label.addEventListener('pointerdown', onDown)
    label.classList.add('sl-editing')
    return () => {
      label.removeEventListener('pointerdown', onDown)
      label.classList.remove('sl-editing')
      label.querySelectorAll('.sl-sel').forEach((n) => n.classList.remove('sl-sel'))
      drags.forEach((e) => e.classList.remove('sl-drag'))
      editables.forEach((e) => e.setAttribute('contenteditable', 'true'))
      selRef.current = null
    }
  }, [layout, reload])

  function fontStep(d: number) {
    const el = selRef.current; if (!el) return
    const px = parseFloat(getComputedStyle(el).fontSize) || 14
    el.style.fontSize = Math.max(2, px / 3.7795 + d).toFixed(2) + 'mm'
  }
  function boldToggle() {
    const el = selRef.current; if (!el) return
    el.style.fontWeight = (parseInt(getComputedStyle(el).fontWeight, 10) || 400) >= 600 ? '400' : '700'
  }
  function resetPos() {
    const el = selRef.current; if (!el) return
    el.style.translate = ''; delete el.dataset.dx; delete el.dataset.dy
  }

  // จำ / คืนค่ารูปแบบป้าย (ข้อความ/ฟอนต์/ตำแหน่ง + ขนาด/แนว/ตัวเลือก) — เก็บในเครื่อง
  function saveLabel() {
    const label = scaler.current?.querySelector('.sl-label') as HTMLElement | null
    if (!label) return
    const clone = label.cloneNode(true) as HTMLElement
    clone.classList.remove('sl-editing')
    clone.querySelectorAll('.sl-sel').forEach((n) => n.classList.remove('sl-sel'))
    clone.querySelectorAll('.sl-drag').forEach((n) => n.classList.remove('sl-drag'))
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.setAttribute('contenteditable', 'true'))
    clone.style.width = ''; clone.style.height = '' // ให้ปรับพอดีจอตอนโหลดใหม่
    try {
      localStorage.setItem('kioskShipLabelHtml', clone.outerHTML)
      localStorage.setItem('kioskShipLabelCfg', JSON.stringify({ sizeKey, cw, ch, orient, fragile, showFrom, boxes, boxno }))
      setSavedExists(true); setMsg('จำรูปแบบป้ายไว้แล้ว — เปิดครั้งหน้าจะขึ้นตามนี้')
    } catch { setMsg('บันทึกไม่สำเร็จ') }
    setTimeout(() => setMsg(''), 3000)
  }
  function resetLabel() {
    try { localStorage.removeItem('kioskShipLabelHtml'); localStorage.removeItem('kioskShipLabelCfg') } catch { /* ignore */ }
    setSizeKey('a6'); setCw(10); setCh(15); setOrient('portrait'); setFragile(true); setShowFrom(true); setBoxes('1'); setBoxno('')
    setLayout(false); setSavedExists(false); setMsg('คืนค่าเริ่มต้นแล้ว')
    setReload((n) => n + 1)
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => { const el = scaler.current?.querySelector('.sl-fragile') as HTMLElement | null; if (el) el.style.display = fragile ? '' : 'none' }, [fragile])
  useEffect(() => { const el = scaler.current?.querySelector('.sl-from') as HTMLElement | null; if (el) el.style.display = showFrom ? '' : 'none' }, [showFrom])
  useEffect(() => {
    const b = scaler.current?.querySelector('.sl-boxes'); if (b) b.textContent = boxes || '1'
    const w = scaler.current?.querySelector('.sl-boxnowrap') as HTMLElement | null
    const n = scaler.current?.querySelector('.sl-boxno')
    if (n) n.textContent = boxno.trim()
    if (w) w.style.display = boxno.trim() ? '' : 'none'
  }, [boxes, boxno])

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    setSearching(true)
    try {
      const r = await fetch(`/api/hospitals/search?q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' })
      const j = r.ok ? await r.json() : { items: [] }
      setResults(j.items ?? [])
    } finally { setSearching(false) }
  }

  function pick(h: Hosp) {
    const s = scaler.current; if (!s) return
    const set = (sel: string, txt: string) => { const el = s.querySelector(sel); if (el) el.textContent = txt }
    set('.sl-name', h.name)
    set('.sl-addr', h.address || 'ที่อยู่……………………………………………')
    const c = h.contacts[0]
    set('.sl-cname', c ? `ผู้ติดต่อ ${c.name}${c.position ? ` (${c.position})` : ''}` : 'ผู้ติดต่อ ………………')
    set('.sl-phone', c?.phone || '…………………')
    setResults([]); setQ(h.name)
  }

  // พิมพ์ตามขนาดจริง (iframe + Blob) รอรูปโลโก้พร้อมก่อนพิมพ์
  function printLabel() {
    const src = scaler.current?.querySelector('.sl-label') as HTMLElement | null
    if (!src) return
    const clone = src.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
    clone.removeAttribute('style')
    const [w, h] = dims()
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>ป้ายที่อยู่จัดส่ง</title>
      <style>${LABEL_CSS}@page{size:${w}cm ${h}cm;margin:0}html,body{margin:0;padding:0}
      .sl-label{width:${w}cm;height:${h}cm;border-radius:0}</style></head><body>${clone.outerHTML}</body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const ifr = document.createElement('iframe')
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    ifr.src = url
    ifr.onload = () => {
      const w2 = ifr.contentWindow; if (!w2) return
      const go = () => { try { w2.focus(); w2.print() } catch { /* ผู้ใช้ยกเลิก */ } }
      const imgs = Array.from(w2.document.images).filter((im) => !im.complete)
      if (!imgs.length) setTimeout(go, 150)
      else { let n = imgs.length; const d = () => { if (--n <= 0) setTimeout(go, 80) }; imgs.forEach((im) => { im.addEventListener('load', d); im.addEventListener('error', d) }); setTimeout(go, 1500) }
      setTimeout(() => { URL.revokeObjectURL(url); ifr.remove() }, 60000)
    }
    document.body.appendChild(ifr)
  }

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
      <style>{`.sl-label [contenteditable]:hover{background:#fff8e6}.sl-label [contenteditable]:focus{outline:2px solid var(--brand);outline-offset:1px}.sl-editing .sl-drag{cursor:move}.sl-drag.sl-sel{outline:2px dashed var(--brand);outline-offset:2px}${LABEL_CSS}`}</style>

      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เลือกแบบฟอร์มอื่น</button>
        <span className="text-[#C9D3E0]">/</span>
        <span className="text-[15px] font-bold text-[#233047]">📦 ป้ายที่อยู่จัดส่ง</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="lg:sticky lg:top-20 self-start space-y-4">
          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">1) ค้นหาโรงพยาบาล</div>
            <form onSubmit={search} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อโรงพยาบาล / จังหวัด / รหัส"
                className="flex-1 text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--brand)]" />
              <button type="submit" disabled={searching} className="text-[13px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">{searching ? '…' : 'ค้นหา'}</button>
            </form>
            {results.length > 0 && (
              <div className="mt-2 border border-[#EEF2F7] rounded-xl divide-y divide-[#F1F4F8] max-h-64 overflow-auto">
                {results.map((h) => (
                  <button key={h.id} type="button" onClick={() => pick(h)} className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC]">
                    <div className="text-[13px] font-semibold text-[#233047]">{h.name}</div>
                    <div className="text-[11.5px] text-[#8492A6]">{h.province}{h.contacts[0] ? ` · ${h.contacts[0].name}${h.contacts[0].phone ? ` ${h.contacts[0].phone}` : ''}` : ''}{h.address ? '' : ' · (ยังไม่มีที่อยู่)'}</div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#96A2B5] mt-2 leading-relaxed">ดึงชื่อ/ที่อยู่/ผู้ติดต่อจากฐานโรงพยาบาล · แก้ในป้ายได้ทุกช่อง (คลิกที่ข้อความ)</p>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-3">
            <div className="text-[13px] font-bold text-[#233047]">2) ขนาดกระดาษ &amp; แนววาง</div>
            <select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)}
              className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-[var(--brand)]">
              <option value="a6">A6 (10.5 × 14.8 ซม.)</option>
              <option value="a5">A5 (14.8 × 21 ซม.)</option>
              <option value="a4">A4 (21 × 29.7 ซม.)</option>
              <option value="s1015">สติกเกอร์ 10 × 15 ซม.</option>
              <option value="l46">ลาเบล 4 × 6 นิ้ว</option>
              <option value="custom">กำหนดเอง…</option>
            </select>
            {sizeKey === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-[11px] font-semibold text-[#5A6B82] mb-1">กว้าง (ซม.)</div>
                  <input type="number" step="0.1" min="4" value={cw} onChange={(e) => setCw(+e.target.value)} className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-1.5" /></div>
                <div><div className="text-[11px] font-semibold text-[#5A6B82] mb-1">สูง (ซม.)</div>
                  <input type="number" step="0.1" min="4" value={ch} onChange={(e) => setCh(+e.target.value)} className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-1.5" /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {(['portrait', 'landscape'] as const).map((o) => (
                <button key={o} type="button" onClick={() => setOrient(o)}
                  className={`text-[13px] font-semibold px-2 py-2 rounded-lg border ${orient === o ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                  {o === 'portrait' ? '⬍ แนวตั้ง' : '⬌ แนวนอน'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2.5">
            <div className="text-[13px] font-bold text-[#233047]">3) ตัวเลือก</div>
            <label className="flex items-center gap-2 text-[13px] text-[#3C4A5E] cursor-pointer"><input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} className="accent-[var(--brand)]" /> ป้าย “ระวังแตก / ห้ามโยน”</label>
            <label className="flex items-center gap-2 text-[13px] text-[#3C4A5E] cursor-pointer"><input type="checkbox" checked={showFrom} onChange={(e) => setShowFrom(e.target.checked)} className="accent-[var(--brand)]" /> แสดงผู้ส่ง (โลโก้ BMS + ที่อยู่)</label>
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[11px] font-semibold text-[#5A6B82] mb-1">จำนวนกล่อง</div>
                <input value={boxes} onChange={(e) => setBoxes(e.target.value)} className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-1.5" /></div>
              <div><div className="text-[11px] font-semibold text-[#5A6B82] mb-1">กล่องที่ (เช่น 1/3)</div>
                <input value={boxno} onChange={(e) => setBoxno(e.target.value)} className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-1.5" /></div>
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2.5">
            <div className="text-[13px] font-bold text-[#233047]">4) จัดวาง &amp; ตัวอักษร</div>
            <button type="button" onClick={() => setLayout((v) => !v)}
              className={`w-full text-[13px] font-semibold px-3 py-2 rounded-lg border ${layout ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
              {layout ? '✓ โหมดจัดวาง (ลากวางได้)' : '✥ โหมดจัดวาง (ลากวาง/ปรับตัวอักษร)'}
            </button>
            {layout && (
              <>
                <p className="text-[11px] text-[#96A2B5] leading-relaxed">คลิกเลือกข้อความในป้าย → ลากเพื่อย้าย หรือใช้ปุ่มปรับขนาด/ตัวหนา (โหมดนี้พิมพ์แก้ข้อความไม่ได้ชั่วคราว)</p>
                <div className="grid grid-cols-4 gap-1.5 text-[12px] font-semibold">
                  <button type="button" onClick={() => fontStep(-0.4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">A−</button>
                  <button type="button" onClick={() => fontStep(0.4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">A＋</button>
                  <button type="button" onClick={boldToggle} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)] font-bold">หนา</button>
                  <button type="button" onClick={resetPos} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]" title="คืนตำแหน่ง">↺</button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#233047]">💾 จำรูปแบบป้าย</div>
            <p className="text-[11px] text-[#96A2B5] leading-relaxed">จัดข้อความ/ฟอนต์/ตำแหน่ง + ขนาด/แนว/ตัวเลือกให้พอใจ แล้วกด “จำรูปแบบ” ครั้งเดียว — เปิดครั้งหน้าจะขึ้นตามนี้ (เก็บในเครื่องของคุณ) · ข้อมูล รพ. ยังค้นหาใหม่ทับได้เสมอ</p>
            <div className="flex gap-2">
              <button type="button" onClick={saveLabel}
                className="flex-1 text-[13px] font-semibold px-3 py-2 rounded-lg bg-[#3C4A5E] text-white hover:bg-[#2C3646]">💾 จำรูปแบบป้าย</button>
              {savedExists && (
                <button type="button" onClick={resetLabel}
                  className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#5A6B82] hover:border-[#C13540] hover:text-[#C13540]">↺ คืนค่าเริ่มต้น</button>
              )}
            </div>
            {savedExists && <div className="text-[11.5px] text-[#157F4C] font-semibold">✓ ใช้รูปแบบที่จำไว้อยู่</div>}
            {msg && <div className="text-[11.5px] text-[var(--brand)] font-semibold">{msg}</div>}
          </div>

          <button type="button" onClick={printLabel}
            className="w-full text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E]">🖨️ พิมพ์ป้าย</button>
        </div>

        <div>
          <div className="text-[12px] text-[#8492A6] mb-2 text-center">{meta}</div>
          <div ref={fit} className="min-w-0 overflow-hidden bg-[#EEF1F5] rounded-2xl p-4 flex justify-center">
            <div ref={scaler} className="shadow-[0_10px_40px_-16px_rgba(18,45,90,0.4)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
