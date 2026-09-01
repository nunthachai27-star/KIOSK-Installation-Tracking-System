'use client'
import { useEffect, useRef, useState } from 'react'
import { BMS_LOGO_DATA_URL } from '@/lib/bmsLogo'

// ── คลังแบบฟอร์ม ─────────────────────────────────────────────────────────────
// เพิ่มแม่แบบใหม่ได้ที่นี่ (สร้าง builder อีกตัวแล้วผูกใน SHEETS)
type TemplateId = 'kiosk-activation'
type Template = { id: TemplateId; title: string; desc: string; defaultCat: string; accent: string }
const TEMPLATES: Template[] = [
  {
    id: 'kiosk-activation',
    title: 'ขออนุมัติเปิดสิทธิ์การใช้งาน Kiosk',
    desc: 'แบบฟอร์มขออนุมัติเปิดสิทธิ์ BMS Smart Hospital Kiosk (ส่งตรวจ) — แก้ไขได้ทุกช่อง',
    defaultCat: 'สัญญา / PO',
    accent: '#C6303A',
  },
]

type JobHit = { id: string; jobCode: string; contractNo: string | null; province: string | null; hospital: { name: string } | null }

const A4_W = 794 // px @ ~96dpi

// ── ตัวสร้าง HTML ของฟอร์ม (inline style ล้วน เพื่อเรนเดอร์เป็นรูปได้ครบ) ──────
// โลโก้ BMS ใช้ไฟล์ทางการฝังเป็น data URI (ทำงานทั้งบนจอ, ตอนเรนเดอร์เป็นรูป และพิมพ์)
function bmsLogoImg(w = 84) {
  return `<img src="${BMS_LOGO_DATA_URL}" alt="BMS" width="${w}" height="${w}" style="display:block;width:${w}px;height:${w}px;object-fit:contain;" />`
}

const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))

// แถวตาราง ตู้ที่ / BMS Serial / MAC Address (ใช้ร่วมทั้งตอนสร้างฟอร์มและเติมข้อมูลงาน)
function unitRowHtml(i: number, serial = '', mac = ''): string {
  const cell = 'padding:5px 8px;border:1px solid #c9c9c9;font-size:14px;'
  return `<tr>
      <td style="${cell}text-align:center;width:52px;" contenteditable="true">${i}</td>
      <td style="${cell}" contenteditable="true">${esc(serial)}</td>
      <td style="${cell}" contenteditable="true">${esc(mac)}</td>
      <td class="ff-noprint" style="width:34px;text-align:center;border:0;"><button type="button" class="ff-delrow" title="ลบแถว" style="border:0;background:#f3d9db;color:#a02a32;border-radius:6px;width:24px;height:24px;cursor:pointer;font-weight:700;">✕</button></td>
    </tr>`
}

function buildKioskActivation(): string {
  const ed = 'contenteditable="true"'
  const cell = 'padding:5px 8px;border:1px solid #c9c9c9;font-size:14px;'
  const row = (i: number) => unitRowHtml(i, `BMS-KI69-0${29 + i}`, '')
  return `
  <div id="ff-sheet" style="width:${A4_W}px;box-sizing:border-box;background:#fff;color:#1b1b1b;font-family:'Sarabun','TH Sarabun New','Leelawadee UI',system-ui,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;">
    <div style="border:1px solid #2a2a2a;padding:22px 26px 30px;">
      <div style="display:flex;align-items:flex-start;gap:14px;">
        <div style="flex:0 0 auto;">${bmsLogoImg(84)}</div>
        <div ${ed} style="font-size:11.5px;line-height:1.5;color:#333;">บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)<br>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร<br>โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292<br>เลขที่ประจำตัวผู้เสียภาษี 0105548152334</div>
      </div>

      <h1 ${ed} style="text-align:center;text-decoration:underline;font-size:17px;font-weight:700;margin:16px 0 14px;">เอกสารการขออนุมัติเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ)</h1>

      <p style="margin:8px 0;">ชื่อผู้ร้องขอ(BMS)&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #999;padding:0 4px;">นางสาวธนิตา สายวารี</span>&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #999;padding:0 4px;">เจ้าหน้าที่ชำนาญการขายและการตลาด</span></p>

      <p ${ed} style="margin:8px 0;">ขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติรุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้ ดังนี้</p>

      <p style="margin:12px 0 6px;">1. <span id="ff-hospital" ${ed} style="border-bottom:1px dotted #999;padding:0 4px;font-weight:600;">โรงพยาบาล………………………</span>&nbsp;&nbsp;จังหวัด <span id="ff-province" ${ed} style="border-bottom:1px dotted #999;padding:0 4px;">………………</span></p>

      <table style="width:100%;border-collapse:collapse;margin:6px 0 4px;">
        <thead>
          <tr>
            <th style="${cell}background:#f4f4f4;text-align:center;width:52px;">ตู้ที่</th>
            <th style="${cell}background:#f4f4f4;text-align:left;">เลข BMS Serial</th>
            <th style="${cell}background:#f4f4f4;text-align:left;">MAC Address</th>
            <th class="ff-noprint" style="width:34px;border:0;"></th>
          </tr>
        </thead>
        <tbody id="ff-units">${row(1)}${row(2)}${row(3)}</tbody>
      </table>
      <div class="ff-noprint" style="margin:2px 0 12px;"><button type="button" id="ff-addrow" style="border:1px dashed #b9c2cf;background:#f7f9fc;color:#3c4a5e;border-radius:8px;padding:4px 12px;font-size:12.5px;font-weight:600;cursor:pointer;">＋ เพิ่มแถว</button></div>

      <p ${ed} style="margin:10px 0;">ดังนั้นฝ่ายการตลาด จึงขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติ รุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้</p>

      <p style="margin:16px 0;">เริ่มตั้งแต่วันที่&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #999;padding:0 40px;"></span></p>

      <p style="margin:16px 0 4px;">จึงเรียนมาเพื่อโปรดพิจารณา</p>
      <div style="display:flex;gap:26px;margin:4px 0 6px;padding-left:8px;">
        <label style="display:inline-flex;align-items:center;gap:8px;"><span class="ff-check" data-checked="0" style="display:inline-block;width:16px;height:16px;border:1.4px solid #333;border-radius:3px;text-align:center;line-height:14px;font-size:13px;cursor:pointer;"></span>อนุมัติ</label>
        <label style="display:inline-flex;align-items:center;gap:8px;"><span class="ff-check" data-checked="0" style="display:inline-block;width:16px;height:16px;border:1.4px solid #333;border-radius:3px;text-align:center;line-height:14px;font-size:13px;cursor:pointer;"></span>ไม่อนุมัติ</label>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:28px;">
        <div style="text-align:center;min-width:260px;">
          <div style="border-bottom:1px dotted #888;height:26px;"></div>
          <div style="margin-top:4px;">( <span ${ed}>นางสาวนิธยาภรณ์ สุทธินุ่น</span> )</div>
          <div ${ed}>ผู้อนุมัติ</div>
        </div>
      </div>

      <p ${ed} style="margin:14px 0;font-size:14px;">ฝ่ายการตลาดรับทราบและดำเนินการแจ้งทีม Call Center เพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ) ต่อไป</p>

      <div style="display:flex;justify-content:center;margin:30px 0 10px;">
        <div style="text-align:center;min-width:260px;">
          <div style="border-bottom:1px dotted #888;height:26px;"></div>
          <div style="margin-top:4px;">( <span ${ed}>นางสาวธนิตา สายวารี</span> )</div>
          <div ${ed}>ผู้จัดทำ</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:38px;gap:24px;">
        <div style="text-align:center;flex:1;">
          <div style="border-bottom:1px dotted #888;height:22px;"></div>
          <div style="margin-top:4px;">(<span ${ed}>นางสาวภัคธินันท์ วิโรจน์ธานีกุล</span>)</div>
          <div ${ed}>หัวหน้าแผนกการขายและการตลาด</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="border-bottom:1px dotted #888;height:22px;"></div>
          <div style="margin-top:4px;">(<span ${ed}>นางสาวปราณี มีเกาะ</span>)</div>
          <div ${ed}>ผู้ดำเนินการเปิด Activation</div>
        </div>
      </div>
    </div>
  </div>`
}

function buildSheet(id: TemplateId): string {
  switch (id) {
    case 'kiosk-activation': return buildKioskActivation()
    default: return ''
  }
}

// ── DOM → PNG ด้วย SVG foreignObject (ไม่พึ่ง library) ────────────────────────
async function nodeToPngBlob(node: HTMLElement, scale = 2): Promise<Blob> {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.ff-noprint').forEach((n) => n.remove())
  clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  const w = node.offsetWidth || A4_W
  const h = node.scrollHeight || node.offsetHeight
  const xml = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">${xml}</foreignObject></svg>`
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render')); img.src = url })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'))
}

export function FormBuilder({ initialJobId }: { initialJobId?: string }) {
  const [tpl, setTpl] = useState<Template | null>(null)
  const [job, setJob] = useState<JobHit | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<JobHit[]>([])
  const [searching, setSearching] = useState(false)
  const [cats, setCats] = useState<string[]>([])
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const sheetWrap = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const scalerRef = useRef<HTMLDivElement>(null)

  // ชนิดเอกสาร (จาก ตั้งค่า › ชนิดเอกสารงาน)
  useEffect(() => {
    fetch('/api/settings/options?category=JOB_DOC_TYPE', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: { value: string; active: boolean }[]) => {
        const vals = (items || []).filter((i) => i.active).map((i) => i.value)
        if (vals.length) setCats(vals)
      }).catch(() => {})
  }, [])

  // เปิดฟอร์มมาจากลิงก์งาน (?job=)
  useEffect(() => {
    if (!initialJobId) return
    fetch(`/api/jobs/${initialJobId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.id) setJob({ id: j.id, jobCode: j.jobCode, contractNo: j.contractNo ?? null, province: j.province ?? null, hospital: j.hospital ? { name: j.hospital.name } : null }) })
      .catch(() => {})
  }, [initialJobId])

  // เมื่อเลือกแม่แบบ → วางฟอร์มลง DOM ครั้งเดียว แล้วผูก event เอง (ไม่ให้ React มายุ่ง)
  useEffect(() => {
    const wrap = sheetWrap.current
    if (!wrap || !tpl) return
    wrap.innerHTML = buildSheet(tpl.id)
    setCat((c) => c || tpl.defaultCat)

    const ac = new AbortController()
    const tbody = wrap.querySelector('#ff-units') as HTMLTableSectionElement | null
    function makeRow(): HTMLTableRowElement {
      const tbl = document.createElement('tbody')
      tbl.innerHTML = unitRowHtml((tbody?.rows.length ?? 0) + 1)
      return tbl.rows[0]
    }
    wrap.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      if (t.id === 'ff-addrow') { tbody?.appendChild(makeRow()); return }
      if (t.classList?.contains('ff-delrow')) { t.closest('tr')?.remove(); return }
      if (t.classList?.contains('ff-check')) {
        const on = t.getAttribute('data-checked') === '1'
        t.setAttribute('data-checked', on ? '0' : '1')
        t.textContent = on ? '' : '✓'
      }
    }, { signal: ac.signal })
    return () => ac.abort()
  }, [tpl])

  // ย่อเอกสารให้พอดีความกว้างที่มี (ไม่เกินขนาดจริง) — กันแถบเลื่อนแนวนอน
  // แต่ยังเรนเดอร์/พิมพ์ที่ความละเอียดเต็ม A4 เพราะ transform ไม่กระทบ layout box
  useEffect(() => {
    const outer = fitRef.current
    const inner = scalerRef.current
    if (!outer || !inner) return
    const apply = () => {
      const avail = outer.clientWidth
      const natW = inner.offsetWidth || 1
      const s = Math.min(1, avail / natW)
      inner.style.transformOrigin = 'top left'
      inner.style.transform = `scale(${s})`
      outer.style.height = inner.offsetHeight * s + 'px'
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(outer); ro.observe(inner)
    return () => ro.disconnect()
  }, [tpl])

  // เติมข้อมูลงานเมื่อเลือก: ชื่อ รพ./จังหวัด + ตาราง BMS Serial & MAC จากงานจริง
  useEffect(() => {
    const wrap = sheetWrap.current
    if (!wrap || !job) return
    let alive = true
    const h = wrap.querySelector('#ff-hospital')
    const p = wrap.querySelector('#ff-province')
    if (h && job.hospital?.name) h.textContent = job.hospital.name
    if (p && job.province) p.textContent = job.province
    // ดึง Serial + MAC ของเครื่องในงาน มาเติมตาราง
    fetch(`/api/jobs/${job.id}/units`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { units: [] }))
      .then((j: { units: { serialNo: string; mac: string }[] }) => {
        if (!alive) return
        const tbody = wrap.querySelector('#ff-units') as HTMLTableSectionElement | null
        const units = j.units || []
        if (tbody && units.length) tbody.innerHTML = units.map((u, i) => unitRowHtml(i + 1, u.serialNo, u.mac)).join('')
      })
      .catch(() => {})
    return () => { alive = false }
  }, [job, tpl])

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    const term = q.trim()
    if (!term) return
    setSearching(true); setMsg(null)
    try {
      const r = await fetch(`/api/jobs?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
      const list = r.ok ? await r.json() : []
      setHits((Array.isArray(list) ? list : []).slice(0, 12).map((j: { id: string; jobCode: string; contractNo?: string | null; province?: string | null; hospital?: { name: string } | null }) => ({
        id: j.id, jobCode: j.jobCode, contractNo: j.contractNo ?? null, province: j.province ?? null, hospital: j.hospital ?? null,
      })))
    } finally { setSearching(false) }
  }

  async function saveToJob() {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet || !tpl) return
    if (!job) { setMsg({ kind: 'err', text: 'เลือกงานปลายทางก่อน (ค้นหาด้วยเลขสัญญา/รหัสงาน)' }); return }
    setBusy(true); setMsg(null)
    try {
      setPhase('กำลังสร้างเอกสาร…')
      const blob = await nodeToPngBlob(sheet, 2)
      const fname = `${tpl.title}-${job.jobCode}.png`.replace(/[\\/:*?"<>|]+/g, '-')
      const file = new File([blob], fname, { type: 'image/png' })
      setPhase('กำลังบันทึกเข้าเอกสารงาน…')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', cat || tpl.defaultCat)
      const r = await fetch(`/api/jobs/${job.id}/documents`, { method: 'POST', body: fd })
      const j = await r.json().catch(() => ({}))
      if (r.ok) setMsg({ kind: 'ok', text: `บันทึกเข้าเอกสารงาน ${job.jobCode} แล้ว` })
      else setMsg({ kind: 'err', text: j.message || 'บันทึกไม่สำเร็จ' })
    } catch {
      setMsg({ kind: 'err', text: 'สร้างเอกสารไม่สำเร็จ (เบราว์เซอร์ไม่รองรับการเรนเดอร์) — ลองใช้ Chrome/Edge' })
    } finally { setBusy(false); setPhase('') }
  }

  function printSheet() {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) return
    const clone = sheet.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ff-noprint').forEach((n) => n.remove())
    const w = window.open('', '_blank', 'width=900,height=1100')
    if (!w) { setMsg({ kind: 'err', text: 'เปิดหน้าต่างพิมพ์ไม่ได้ — โปรดอนุญาต pop-up' }); return }
    w.document.open()
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${tpl?.title ?? 'แบบฟอร์ม'}</title><style>@page{size:A4;margin:12mm}body{margin:0;display:flex;justify-content:center}</style></head><body>${clone.outerHTML}</body></html>`)
    w.document.close()
    setTimeout(() => { try { w.focus(); w.print() } catch { /* ผู้ใช้ปิดไปก่อน */ } }, 400)
  }

  const catList = cats.length ? cats : [tpl?.defaultCat ?? 'สัญญา / PO']

  // ── หน้าเลือกแม่แบบ ─────────────────────────────────────────────────────────
  if (!tpl) {
    return (
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-[20px] font-bold text-[#1F2A3C] mb-1">📝 แบบฟอร์มเอกสาร</h1>
        <p className="text-[13px] text-[#8492A6] mb-5">เลือกแบบฟอร์ม → แก้ไขได้ทุกช่อง → ค้นหางานด้วยเลขสัญญา/PO แล้วบันทึกเข้า “เอกสารงาน” ของงานนั้นได้เลย</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTpl(t)}
              className="text-left bg-white border border-[#E7EDF4] rounded-2xl p-5 hover:border-[var(--brand)] hover:shadow-[0_12px_30px_-16px_rgba(18,45,90,0.35)] transition">
              <div className="w-10 h-10 grid place-items-center rounded-xl mb-3 text-white text-[18px]" style={{ background: t.accent }}>📄</div>
              <div className="text-[15px] font-bold text-[#233047] mb-1">{t.title}</div>
              <div className="text-[12.5px] text-[#8492A6] leading-relaxed">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── หน้าแก้ไข + บันทึก ───────────────────────────────────────────────────────
  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
      <style>{`#ff-sheet [contenteditable]:hover{background:#fff8e6}#ff-sheet [contenteditable]:focus{outline:2px solid var(--brand);outline-offset:1px;background:#fffdf5;border-radius:3px}`}</style>

      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => { setTpl(null); setJob(null); setHits([]); setMsg(null) }}
          className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เลือกแบบฟอร์มอื่น</button>
        <span className="text-[#C9D3E0]">/</span>
        <span className="text-[15px] font-bold text-[#233047]">{tpl.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* แผงควบคุม */}
        <div className="lg:sticky lg:top-20 self-start space-y-4">
          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">1) งานปลายทาง</div>
            <form onSubmit={search} className="flex gap-2 mb-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="เลขสัญญา / PO / รหัสงาน / โรงพยาบาล"
                className="flex-1 text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--brand)]" />
              <button type="submit" disabled={searching}
                className="text-[13px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
                {searching ? '…' : 'ค้นหา'}
              </button>
            </form>
            {hits.length > 0 && !job && (
              <div className="border border-[#EEF2F7] rounded-xl divide-y divide-[#F1F4F8] max-h-64 overflow-auto">
                {hits.map((h) => (
                  <button key={h.id} type="button" onClick={() => { setJob(h); setHits([]) }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC]">
                    <div className="text-[13px] font-semibold text-[#233047]">{h.jobCode}{h.contractNo ? ` · ${h.contractNo}` : ''}</div>
                    <div className="text-[11.5px] text-[#8492A6]">{h.hospital?.name ?? '—'}{h.province ? ` · ${h.province}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            {job && (
              <div className="bg-[#F1FBF5] border border-[#BFE6CE] rounded-xl px-3 py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-[#157F4C]">✓ {job.jobCode}{job.contractNo ? ` · ${job.contractNo}` : ''}</div>
                  <div className="text-[11.5px] text-[#5A6B82]">{job.hospital?.name ?? '—'}{job.province ? ` · ${job.province}` : ''}</div>
                </div>
                <button type="button" onClick={() => setJob(null)} className="text-[12px] text-[#8492A6] hover:text-[#C13540] font-semibold">เปลี่ยน</button>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">2) ชนิดเอกสาร</div>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {catList.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-full border ${cat === c ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#233047] mb-1">3) บันทึก / พิมพ์</div>
            <button type="button" onClick={saveToJob} disabled={busy}
              className="w-full text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E] disabled:opacity-60">
              💾 บันทึกเข้าเอกสารงาน
            </button>
            <button type="button" onClick={printSheet} disabled={busy}
              className="w-full text-[13px] font-semibold px-3 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              🖨️ พิมพ์ / บันทึกเป็น PDF
            </button>
            {busy && <div className="text-[12.5px] text-[var(--brand)] font-semibold">{phase || 'กำลังทำงาน…'}</div>}
            {msg && (
              <div className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.kind === 'ok' ? 'text-[#157F4C] bg-[#EAF7EF] border border-[#BFE6CE]' : 'text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4]'}`}>
                {msg.text}{msg.kind === 'ok' && job && <> · <a href={`/jobs/${job.id}`} className="underline font-semibold">เปิดงาน</a></>}
              </div>
            )}
            <p className="text-[11px] text-[#96A2B5] leading-relaxed">คลิกในเอกสารเพื่อแก้ไขข้อความได้ทุกจุด · ช่องติ๊ก ✓ กดที่กล่องเพื่อสลับ · ปุ่มลบแถว/เพิ่มแถวจะไม่ติดไปในไฟล์ที่บันทึก</p>
          </div>
        </div>

        {/* ตัวเอกสาร (แก้ไขได้) — ย่อพอดีจอ ไม่มีแถบเลื่อนล่าง */}
        <div ref={fitRef} className="min-w-0 overflow-hidden">
          <div ref={scalerRef} className="inline-block bg-[#EEF1F5] rounded-2xl p-4 shadow-inner">
            <div ref={sheetWrap} className="bg-white shadow-[0_10px_40px_-16px_rgba(18,45,90,0.4)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
