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

// ฟอนต์ให้เลือก (ฟอนต์ไทยที่มักติดตั้งในเครื่อง Windows)
const FONTS: { key: string; label: string; stack: string }[] = [
  { key: 'sarabun', label: 'Sarabun', stack: "'Sarabun','TH Sarabun New','Leelawadee UI',sans-serif" },
  { key: 'thsarabun', label: 'TH Sarabun New', stack: "'TH Sarabun New','TH SarabunPSK','Sarabun',sans-serif" },
  { key: 'angsana', label: 'Angsana New', stack: "'Angsana New','AngsanaUPC','TH Sarabun New',serif" },
  { key: 'cordia', label: 'Cordia New', stack: "'Cordia New','CordiaUPC','Leelawadee UI',sans-serif" },
  { key: 'tahoma', label: 'Tahoma', stack: "Tahoma,'Leelawadee UI',sans-serif" },
  { key: 'system', label: 'ค่าเริ่มต้นระบบ', stack: "system-ui,'Segoe UI','Leelawadee UI',sans-serif" },
]

// ── ตัวสร้าง HTML ของฟอร์ม (inline style ล้วน เพื่อเรนเดอร์เป็นรูปได้ครบ) ──────
// โลโก้ BMS ใช้ไฟล์ทางการฝังเป็น data URI (ทำงานทั้งบนจอ, ตอนเรนเดอร์เป็นรูป และพิมพ์)
function bmsLogoImg(w = 84) {
  return `<img src="${BMS_LOGO_DATA_URL}" alt="BMS" width="${w}" height="${w}" style="display:block;width:${w}px;height:${w}px;object-fit:contain;" />`
}

const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))

// บรรทัดรายการเครื่อง (ตู้ที่ / BMS Serial / MAC) แบบมีเส้นบรรทัด ตามฟอร์มต้นฉบับ
function unitRowHtml(i: number, serial = '', mac = ''): string {
  const s = esc(serial), m = esc(mac)
  const text = (s || m)
    ? `- ตู้ที่ ${i} &nbsp;&nbsp;MAC Address&nbsp;&nbsp; เลข BMS Serial: ${s}${m ? ` : ${m}` : ''}`
    : '&nbsp;'
  return `<tr>
      <td class="ff-unit" style="border-bottom:1px solid #000;padding:5px 6px 5px 18px;" contenteditable="true">${text}</td>
      <td class="ff-noprint" style="width:28px;text-align:center;border:0;vertical-align:middle;"><button type="button" class="ff-delrow" title="ลบบรรทัด" style="border:0;background:#f3d9db;color:#a02a32;border-radius:6px;width:22px;height:22px;cursor:pointer;font-weight:700;">✕</button></td>
    </tr>`
}

const COMPANY_LINES = 'บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)<br>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร<br>โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292<br>เลขที่ประจำตัวผู้เสียภาษี 0105548152334'

function buildKioskActivation(): string {
  const ed = 'contenteditable="true"'
  const sig = 'border-bottom:1px dotted #000;height:1px;margin-bottom:6px;'
  const chk = '<span class="ff-check" data-checked="0" style="display:inline-block;width:17px;height:17px;border:1.3px solid #000;text-align:center;line-height:15px;font-size:13px;cursor:pointer;vertical-align:middle;"></span>'
  // ตัวอย่างเริ่มต้น 3 บรรทัด + บรรทัดว่างมีเส้น 3 บรรทัด (ให้ดูเป็นฟอร์มเหมือนต้นฉบับ)
  const rows = [1, 2, 3].map((i) => unitRowHtml(i, `BMS-KI69-0${29 + i}`)).concat([unitRowHtml(0), unitRowHtml(0), unitRowHtml(0)]).join('')
  return `
  <div id="ff-sheet" style="width:${A4_W}px;box-sizing:border-box;background:#fff;color:#000;font-family:'Sarabun','TH Sarabun New','Leelawadee UI',system-ui,'Segoe UI',sans-serif;font-size:13.5px;line-height:1.55;">
    <div style="border:1px solid #000;">

      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;border-bottom:1px solid #000;">
        <div style="flex:0 0 auto;">${bmsLogoImg(48)}</div>
        <div ${ed} style="font-size:10px;line-height:1.5;">${COMPANY_LINES}</div>
      </div>

      <div style="text-align:center;padding:7px 12px;border-bottom:1px solid #000;">
        <span ${ed} style="text-decoration:underline;font-weight:700;font-size:15px;">เอกสารการขออนุมัติเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ)</span>
      </div>

      <div style="text-align:center;padding:6px 12px;border-bottom:1px solid #000;">
        ชื่อผู้ร้องขอ(BMS)&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 6px;">นางสาวธนิตา สายวารี</span>&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 6px;">เจ้าหน้าที่ชำนาญการขายและการตลาด</span>
      </div>

      <div style="padding:8px 12px 0;">
        <p ${ed} style="margin:0 0 8px;">ขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติรุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้ ดังนี้</p>
        <div style="border-bottom:1px solid #000;padding:2px 0 4px 6px;">1. <span id="ff-hospital" ${ed} style="padding:0 4px;font-weight:600;">โรงพยาบาล………………………</span>&nbsp;จังหวัด <span id="ff-province" ${ed} style="padding:0 4px;">………………</span></div>
        <table style="width:100%;border-collapse:collapse;">
          <tbody id="ff-units">${rows}</tbody>
        </table>
        <div class="ff-noprint" style="margin:6px 0 2px;"><button type="button" id="ff-addrow" style="border:1px dashed #b9c2cf;background:#f7f9fc;color:#3c4a5e;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer;">＋ เพิ่มบรรทัด</button></div>
      </div>

      <div ${ed} style="padding:6px 12px;border-bottom:1px solid #000;">ดังนั้นฝ่ายการตลาด จึงขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติ รุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้</div>

      <div style="padding:12px 12px 4px;">เริ่มตั้งแต่วันที่&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 46px;"></span></div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 16px 0;">
        <div>
          <div style="margin-bottom:4px;">จึงเรียนมาเพื่อโปรดพิจารณา</div>
          <div style="padding-left:26px;">
            <div style="margin:5px 0;">${chk}&nbsp;อนุมัติ</div>
            <div style="margin:5px 0;">${chk}&nbsp;ไม่อนุมัติ</div>
          </div>
        </div>
        <div style="text-align:center;min-width:250px;margin-top:26px;">
          <div style="${sig}"></div>
          <div>( <span ${ed}>นางสาวนิธยาภรณ์ สุทธินุ่น</span> )</div>
          <div ${ed}>ผู้อนุมัติ</div>
        </div>
      </div>

      <div ${ed} style="padding:8px 12px 0;">ฝ่ายการตลาดรับทราบและดำเนินการแจ้งทีม Call Center เพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ) ต่อไป</div>

      <div style="display:flex;justify-content:center;padding:18px 12px 0;">
        <div style="text-align:center;min-width:250px;">
          <div style="${sig}"></div>
          <div>( <span ${ed}>นางสาวธนิตา สายวารี</span> )</div>
          <div ${ed}>ผู้จัดทำ</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:30px;padding:26px 24px 16px;">
        <div style="text-align:center;flex:1;">
          <div style="${sig}"></div>
          <div>(<span ${ed}>นางสาวภัคธินันท์ วิโรจน์ธานีกุล</span>)</div>
          <div ${ed}>หัวหน้าแผนกการขายและการตลาด</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="${sig}"></div>
          <div>(<span ${ed}>นางสาวปราณี มีเกาะ</span>)</div>
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
  clone.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
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
  const [fontKey, setFontKey] = useState('sarabun')
  const [fontPx, setFontPx] = useState(13.5)
  const [lineH, setLineH] = useState(1.55)
  const [layout, setLayout] = useState(false)
  const sheetWrap = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const scalerRef = useRef<HTMLDivElement>(null)
  const selBlock = useRef<HTMLElement | null>(null)

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
        if (tbody && units.length) {
          const rowsHtml = units.map((u, i) => unitRowHtml(i + 1, u.serialNo, u.mac))
          for (let i = units.length; i < 6; i++) rowsHtml.push(unitRowHtml(0)) // บรรทัดว่างมีเส้น
          tbody.innerHTML = rowsHtml.join('')
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [job, tpl])

  // ฟอนต์ / ขนาดตัวอักษร / ระยะบรรทัด — ตั้งที่ root ของเอกสาร (ติดไปตอนบันทึก/พิมพ์ด้วย)
  useEffect(() => {
    const sheet = sheetWrap.current?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) return
    sheet.style.fontFamily = (FONTS.find((f) => f.key === fontKey) ?? FONTS[0]).stack
    sheet.style.fontSize = fontPx + 'px'
    sheet.style.lineHeight = String(lineH)
  }, [tpl, job, fontKey, fontPx, lineH])

  // โหมดจัดวาง — คลิกเลือกบล็อก/บรรทัด แล้วเลื่อนขึ้น-ลง/เว้นระยะ/เยื้องได้
  useEffect(() => {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    const container = sheet?.firstElementChild as HTMLElement | null
    if (!wrap || !sheet || !container) return
    if (!layout) return
    const editables = Array.from(sheet.querySelectorAll('[contenteditable="true"]')) as HTMLElement[]
    editables.forEach((e) => e.setAttribute('contenteditable', 'false')) // ปิดพิมพ์ชั่วคราวเพื่อคลิกเลือก
    sheet.classList.add('ff-layout')
    const onClick = (e: Event) => {
      let el = e.target as HTMLElement | null
      while (el && el.parentElement !== container) el = el.parentElement // หาบล็อกระดับบนสุด
      if (!el) return
      wrap.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
      el.classList.add('ff-sel')
      selBlock.current = el
    }
    container.addEventListener('click', onClick)
    return () => {
      container.removeEventListener('click', onClick)
      sheet.classList.remove('ff-layout')
      wrap.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
      editables.forEach((e) => e.setAttribute('contenteditable', 'true'))
      selBlock.current = null
    }
  }, [layout, tpl, job])

  function moveBlock(dir: -1 | 1) {
    const el = selBlock.current, par = el?.parentElement
    if (!el || !par) return
    const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling
    if (!sib) return
    if (dir < 0) par.insertBefore(el, sib)
    else par.insertBefore(sib, el)
  }
  function nudge(prop: 'marginTop' | 'marginLeft', d: number) {
    const el = selBlock.current
    if (!el) return
    const cur = parseFloat(el.style[prop] || '0') || 0
    el.style[prop] = Math.max(0, cur + d) + 'px'
  }

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
      const blob = await nodeToPngBlob(sheet, 3)
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

  // พิมพ์ผ่าน iframe + Blob URL (เสถียรกว่า window.open('about:blank') ที่ Chrome มัก
  // พิมพ์ไม่ผ่าน) และรอให้รูปโหลดเสร็จก่อนสั่งพิมพ์ กัน "Print Failed"
  function printSheet() {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) return
    const clone = sheet.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ff-noprint').forEach((n) => n.remove())
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
    // ย่อให้พอดี 1 หน้า A4 เสมอ (A4 @96dpi = 794×1123px, เว้นขอบ ~9mm)
    const PAGE_W = 794, PAGE_H = 1123, PAD = 34
    const sheetH = sheet.scrollHeight || sheet.offsetHeight
    const scale = Math.min((PAGE_W - 2 * PAD) / A4_W, (PAGE_H - 2 * PAD) / sheetH, 1)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tpl?.title ?? 'แบบฟอร์ม'}</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}.pg{width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;padding:${PAD}px;display:flex;justify-content:center;align-items:flex-start;overflow:hidden}.ft{transform:scale(${scale});transform-origin:top center}</style></head><body><div class="pg"><div class="ft">${clone.outerHTML}</div></div></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const ifr = document.createElement('iframe')
    ifr.setAttribute('aria-hidden', 'true')
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    ifr.src = url
    ifr.onload = () => {
      const w = ifr.contentWindow
      if (!w) return
      const go = () => { try { w.focus(); w.print() } catch { /* ผู้ใช้ยกเลิก */ } }
      // รอรูป (โลโก้) ให้พร้อมก่อนพิมพ์
      const imgs = Array.from(w.document.images)
      const pending = imgs.filter((im) => !im.complete)
      if (!pending.length) setTimeout(go, 150)
      else {
        let left = pending.length
        const done = () => { if (--left <= 0) setTimeout(go, 100) }
        pending.forEach((im) => { im.addEventListener('load', done); im.addEventListener('error', done) })
        setTimeout(go, 1500) // กันค้าง
      }
      setTimeout(() => { URL.revokeObjectURL(url); ifr.remove() }, 60000)
    }
    document.body.appendChild(ifr)
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
      <style>{`#ff-sheet [contenteditable]:hover{background:#fff8e6}#ff-sheet [contenteditable]:focus{outline:2px solid var(--brand);outline-offset:1px;background:#fffdf5;border-radius:3px}#ff-sheet.ff-layout,#ff-sheet.ff-layout *{cursor:pointer}#ff-sheet.ff-layout>div>*{outline:1px dashed #C3D0E0;outline-offset:-1px}#ff-sheet .ff-sel{outline:2px solid var(--brand)!important;background:#FFF6E0}`}</style>

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

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-3">
            <div className="text-[13px] font-bold text-[#233047]">3) ฟอนต์ &amp; รูปแบบ</div>
            <div>
              <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ฟอนต์</div>
              <select value={fontKey} onChange={(e) => setFontKey(e.target.value)}
                className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-[var(--brand)]">
                {FONTS.map((f) => <option key={f.key} value={f.key} style={{ fontFamily: f.stack }}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ขนาดตัวอักษร</div>
                <div className="flex items-center border border-[#DCE4EE] rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setFontPx((v) => Math.max(11, +(v - 0.5).toFixed(1)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">−</button>
                  <span className="flex-1 text-center text-[12.5px] tabular-nums">{fontPx}px</span>
                  <button type="button" onClick={() => setFontPx((v) => Math.min(20, +(v + 0.5).toFixed(1)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">＋</button>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ระยะบรรทัด</div>
                <div className="flex items-center border border-[#DCE4EE] rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setLineH((v) => Math.max(1.1, +(v - 0.1).toFixed(2)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">−</button>
                  <span className="flex-1 text-center text-[12.5px] tabular-nums">{lineH.toFixed(2)}</span>
                  <button type="button" onClick={() => setLineH((v) => Math.min(2.4, +(v + 0.1).toFixed(2)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">＋</button>
                </div>
              </div>
            </div>

            <div className="pt-1 border-t border-[#F0F3F7]">
              <button type="button" onClick={() => setLayout((v) => !v)}
                className={`w-full text-[13px] font-semibold px-3 py-2 rounded-lg border ${layout ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                {layout ? '✓ โหมดจัดวาง (กำลังเปิด)' : '↕ โหมดจัดวาง (เลื่อนบรรทัด/ตำแหน่ง)'}
              </button>
              {layout && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-[#96A2B5] leading-relaxed">คลิกเลือกบรรทัด/บล็อกในเอกสาร แล้วใช้ปุ่มด้านล่างเลื่อน (ในโหมดนี้พิมพ์แก้ข้อความไม่ได้ชั่วคราว)</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[12px] font-semibold">
                    <button type="button" onClick={() => moveBlock(-1)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">▲ เลื่อนขึ้น</button>
                    <button type="button" onClick={() => moveBlock(1)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">▼ เลื่อนลง</button>
                    <button type="button" onClick={() => nudge('marginTop', 4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">＋ เว้นบน</button>
                    <button type="button" onClick={() => nudge('marginTop', -4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">− เว้นบน</button>
                    <button type="button" onClick={() => nudge('marginLeft', 8)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">→ เยื้องขวา</button>
                    <button type="button" onClick={() => nudge('marginLeft', -8)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">← เยื้องซ้าย</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#233047] mb-1">4) บันทึก / พิมพ์</div>
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
