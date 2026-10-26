'use client'
import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react'

type LotOpt = { id: string; lotCode: string }
type ProductOpt = { id: string; group: string; name: string; lots: LotOpt[] }
type ParsedRow = { serialNo: string; receivedDate: string | null }
type Summary = { total: number; ready: number; blanks: number[]; inFileDups: string[]; systemDups: string[] }

const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--brand)]'
const NEW = '__new__'

type Src = 'manual' | 'file' | 'sheet'
type MRow = { sn: string; d: string }   // แถวที่กรอก/วางในหน้า (d = YYYY-MM-DD)

function todayYmd() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// แตกข้อความที่วาง (จาก Excel/ชีต/LINE) เป็นแถว: คอลัมน์แรก = Serial, คอลัมน์ที่เป็นวันที่ = วันรับเข้า
function parseBlock(text: string, fallbackDate: string): MRow[] {
  return text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\t|,|\s{2,}/).map((s) => s.trim()).filter(Boolean)
    let d: string | null = null
    for (const p of parts.slice(1)) { d = toYmd(p); if (d) break }
    return { sn: parts[0] ?? '', d: d ?? fallbackDate }
  })
}

// แปลงค่าวันที่จาก cell เป็น YYYY-MM-DD (รองรับ Date ของ Excel, dd/mm/yyyy พ.ศ./ค.ศ., yyyy-mm-dd)
function toYmd(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/) // dd/mm/yyyy
  if (m) {
    let y = Number(m[3]); if (y < 100) y += 2000; if (y > 2400) y -= 543 // พ.ศ. → ค.ศ.
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

export function StockImportForm({ products, groups }: { products: ProductOpt[]; groups: string[] }) {
  // cascading: กลุ่ม → รุ่น → Lot
  const [groupSel, setGroupSel] = useState('')
  const [groupNew, setGroupNew] = useState('')
  const [nameSel, setNameSel] = useState('')
  const [nameNew, setNameNew] = useState('')
  const [lotSel, setLotSel] = useState('')      // lotId เดิม หรือ NEW
  const [lotNew, setLotNew] = useState('')      // รหัส Lot ใหม่
  const [note, setNote] = useState('')

  // ไฟล์/ชีต → grid
  const [headers, setHeaders] = useState<string[]>([])
  const [grid, setGrid] = useState<unknown[][]>([])
  const [serialCol, setSerialCol] = useState(-1)
  const [dateCol, setDateCol] = useState(-1)
  const [srcLabel, setSrcLabel] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')

  // แหล่งข้อมูล: กรอก/วางในหน้า (ค่าเริ่มต้น) · ไฟล์ · Google Sheet
  const [src, setSrc] = useState<Src>('manual')
  const [sharedDate, setSharedDate] = useState(todayYmd)
  const [mRows, setMRows] = useState<MRow[]>(() => Array.from({ length: 5 }, () => ({ sn: '', d: todayYmd() })))

  const [rows, setRows] = useState<ParsedRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState<{ productId: string; count: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const effGroup = groupSel === NEW ? groupNew.trim() : groupSel
  const modelsInGroup = useMemo(() => products.filter((p) => p.group === effGroup), [products, effGroup])
  const effName = nameSel === NEW ? nameNew.trim() : nameSel
  const selectedProduct = useMemo(() => products.find((p) => p.group === effGroup && p.name === effName) ?? null, [products, effGroup, effName])
  const lotsOfProduct = selectedProduct?.lots ?? []

  function resetGrid() { setHeaders([]); setGrid([]); setSerialCol(-1); setDateCol(-1); setRows([]); setSummary(null) }

  function applyGrid(hdr: string[], body: unknown[][], label: string) {
    setHeaders(hdr); setGrid(body); setSrcLabel(label)
    setSerialCol(hdr.findIndex((h) => /serial|ซีเรียล|s\/?n/i.test(h)))
    setDateCol(hdr.findIndex((h) => /วันรับ|รับเข้า|received|date|วันที่/i.test(h)))
    setRows([]); setSummary(null)
  }

  async function onFile(f: File | null) {
    if (!f) return
    setErr(''); setOk(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const g = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true })
      if (!g.length) { setErr('ไฟล์ว่าง'); return }
      let hIdx = g.findIndex((r) => (r as unknown[]).some((c) => /serial|ซีเรียล/i.test(String(c ?? ''))))
      if (hIdx < 0) hIdx = 0
      const hdr = (g[hIdx] as unknown[]).map((c) => String(c ?? '').trim())
      applyGrid(hdr, g.slice(hIdx + 1), f.name)
    } catch {
      setErr('อ่านไฟล์ไม่สำเร็จ — รองรับ .xlsx / .xls / .csv')
    }
  }

  async function fetchSheet() {
    if (!sheetUrl.trim()) return
    setErr(''); setOk(null); setBusy(true)
    try {
      const res = await fetch(`/api/stock/import/sheet?url=${encodeURIComponent(sheetUrl.trim())}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) { setErr(j.message || 'ดึงข้อมูลจากลิงก์ไม่สำเร็จ'); return }
      applyGrid(j.headers as string[], j.grid as unknown[][], 'Google Sheet')
    } finally { setBusy(false) }
  }

  function buildRows(): ParsedRow[] {
    // กรอก/วางในหน้า: แถวที่ไม่มี Serial ถือเป็นแถวว่าง → ข้าม
    if (src === 'manual') {
      return mRows.filter((r) => r.sn.trim()).map((r) => ({ serialNo: r.sn.trim(), receivedDate: r.d || null }))
    }
    if (serialCol < 0) return []
    const out: ParsedRow[] = []
    for (const r of grid) {
      const arr = r as unknown[]
      const serialNo = String(arr[serialCol] ?? '').trim()
      const receivedDate = dateCol >= 0 ? toYmd(arr[dateCol]) : null
      if (!serialNo && !receivedDate) continue
      out.push({ serialNo, receivedDate })
    }
    return out
  }

  function productPayload() {
    return selectedProduct ? { productId: selectedProduct.id } : { newProduct: { group: effGroup, name: effName } }
  }
  function lotPayload() {
    return lotSel && lotSel !== NEW ? { lotId: lotSel } : { lotCode: lotNew.trim() }
  }
  function canSubmit() {
    if (!effGroup || !effName) return false
    if (src === 'manual' ? !mRows.some((r) => r.sn.trim()) : serialCol < 0) return false
    const lotOk = (lotSel && lotSel !== NEW) || lotNew.trim()
    return !!lotOk
  }

  async function preview() {
    setErr(''); setOk(null)
    const r = buildRows()
    if (!r.length) { setErr(src === 'manual' ? 'ยังไม่ได้กรอก Serial' : 'ไม่พบข้อมูลในไฟล์/ชีต'); return }
    setRows(r); setBusy(true)
    try {
      const res = await fetch('/api/stock/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productPayload(), ...lotPayload(), note, rows: r, commit: false }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.message || 'ตรวจไม่สำเร็จ'); setSummary(null); return }
      setSummary(j.summary)
    } finally { setBusy(false) }
  }

  async function commit() {
    if (!summary || summary.inFileDups.length || summary.systemDups.length || summary.blanks.length) return
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/stock/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productPayload(), ...lotPayload(), note, rows, commit: true }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.message || 'นำเข้าไม่สำเร็จ'); if (j.summary) setSummary(j.summary); return }
      setOk({ productId: j.productId, count: j.count })
    } finally { setBusy(false) }
  }

  const problem = summary && (summary.inFileDups.length > 0 || summary.systemDups.length > 0 || summary.blanks.length > 0)

  if (ok) {
    return (
      <div className="ds-card p-5 flex flex-col gap-3">
        <div className="text-[15px] font-bold text-[#157F4C]">✓ นำเข้าสำเร็จ — เพิ่ม {ok.count} เครื่องเข้าคลังแล้ว</div>
        <div className="flex gap-2">
          <a href={`/stock/${ok.productId}`} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">ดูในคลัง ›</a>
          <button onClick={() => { setOk(null); resetGrid(); setSrcLabel(''); setSheetUrl(''); setMRows(Array.from({ length: 5 }, () => ({ sn: '', d: sharedDate }))); if (fileRef.current) fileRef.current.value = '' }}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E]">นำเข้าอีกชุด</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ds-card p-5 flex flex-col gap-4">
      {/* 1. กลุ่ม → รุ่น */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[12.5px] font-semibold text-[#5A6B82]">กลุ่มสินค้า</label>
          <select value={groupSel} onChange={(e) => { setGroupSel(e.target.value); setNameSel(''); setNameNew(''); setLotSel(''); setLotNew('') }} className={`${field} mt-1`}>
            <option value="">— เลือกกลุ่ม —</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value={NEW}>➕ กลุ่มใหม่…</option>
          </select>
          {groupSel === NEW && <input value={groupNew} onChange={(e) => setGroupNew(e.target.value)} placeholder="ชื่อกลุ่มใหม่" className={`${field} mt-2`} />}
        </div>
        <div>
          <label className="text-[12.5px] font-semibold text-[#5A6B82]">รุ่น / อุปกรณ์</label>
          <select value={nameSel} onChange={(e) => { setNameSel(e.target.value); setLotSel(''); setLotNew('') }} disabled={!effGroup} className={`${field} mt-1 disabled:bg-[#F5F5F4]`}>
            <option value="">— เลือกรุ่น —</option>
            {modelsInGroup.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            <option value={NEW}>➕ รุ่นใหม่…</option>
          </select>
          {nameSel === NEW && <input value={nameNew} onChange={(e) => setNameNew(e.target.value)} placeholder="ชื่อรุ่นใหม่" className={`${field} mt-2`} />}
        </div>
      </div>

      {/* 2. Lot */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[12.5px] font-semibold text-[#5A6B82]">Lot</label>
          <select value={lotSel} onChange={(e) => setLotSel(e.target.value)} disabled={!effName} className={`${field} mt-1 disabled:bg-[#F5F5F4]`}>
            <option value="">— เลือก Lot —</option>
            {lotsOfProduct.map((l) => <option key={l.id} value={l.id}>{l.lotCode}</option>)}
            <option value={NEW}>➕ Lot ใหม่ (พิมพ์รหัส)…</option>
          </select>
          {(lotSel === NEW || (!selectedProduct && effName)) && (
            <input value={lotNew} onChange={(e) => setLotNew(e.target.value)} placeholder="รหัส Lot ใหม่ เช่น 1/68" className={`${field} mt-2`} />
          )}
        </div>
        <div>
          <label className="text-[12.5px] font-semibold text-[#5A6B82]">หมายเหตุ (ถ้ามี)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ Lot" className={`${field} mt-1`} />
        </div>
      </div>

      {/* 3. แหล่งข้อมูล: กรอก/วางในหน้า · ไฟล์ · Google Sheet */}
      <div className="flex flex-col gap-3 bg-[#F8FAFD] border border-[#EEF2F8] rounded-lg p-3 min-w-0">
        <div className="text-[12.5px] font-semibold text-[#5A6B82]">ข้อมูล (1 แถว = 1 เครื่อง · Serial NO. + วันรับเข้า)</div>
        <div className="flex gap-1.5 flex-wrap">
          {([['manual', '✎ กรอก/วางในหน้านี้'], ['file', '📄 ไฟล์ Excel/CSV'], ['sheet', '🔗 Google Sheet']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => { if (k !== src && k !== 'manual') { resetGrid(); setSrcLabel('') } setSrc(k); setSummary(null); setErr('') }}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${src === k ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
              {label}
            </button>
          ))}
        </div>

        {src === 'manual' && (
          <ManualGrid rows={mRows} sharedDate={sharedDate} onSharedDate={setSharedDate}
            onChange={(r) => { setMRows(r); setSummary(null) }} />
        )}

        {src === 'file' && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-dashed border-[#B9C2CF] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              📄 เลือกไฟล์ Excel / CSV
            </button>
            {srcLabel && srcLabel !== 'Google Sheet' && <div className="text-[11.5px] text-[#157F4C] font-semibold">โหลดจาก: {srcLabel} · {grid.length} แถว</div>}
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = '' }} />

        {src === 'sheet' && (
          <>
            <div className="flex items-center gap-2">
              <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="วางลิงก์ Google Sheet (แชร์แบบทุกคนที่มีลิงก์ดูได้)" className={`${field} flex-1 min-w-0`} />
              <button type="button" onClick={fetchSheet} disabled={busy || !sheetUrl.trim()}
                className="text-[13px] font-semibold px-3 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-50 shrink-0">ดึงข้อมูล</button>
            </div>
            {srcLabel === 'Google Sheet' && <div className="text-[11.5px] text-[#157F4C] font-semibold">โหลดจาก: Google Sheet · {grid.length} แถว</div>}
          </>
        )}
      </div>

      {/* เลือกคอลัมน์ (เฉพาะไฟล์/ชีต) */}
      {src !== 'manual' && headers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 bg-[#F8FAFD] border border-[#EEF2F8] rounded-lg p-3">
          <label className="text-[12.5px] text-[#5A6B82] font-semibold">คอลัมน์ Serial
            <select value={serialCol} onChange={(e) => setSerialCol(Number(e.target.value))} className={`${field} mt-1`}>
              <option value={-1}>— เลือก —</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `คอลัมน์ ${i + 1}`}</option>)}
            </select>
          </label>
          <label className="text-[12.5px] text-[#5A6B82] font-semibold">คอลัมน์ วันรับเข้า (ถ้ามี)
            <select value={dateCol} onChange={(e) => setDateCol(Number(e.target.value))} className={`${field} mt-1`}>
              <option value={-1}>— ไม่มี —</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `คอลัมน์ ${i + 1}`}</option>)}
            </select>
          </label>
        </div>
      )}

      {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2">{err}</div>}

      {summary && (
        <div className={`rounded-lg px-3 py-2.5 border ${problem ? 'bg-[#FBE9E9] border-[#E7B4B4]' : 'bg-[#EAF7EF] border-[#BFE6CE]'}`}>
          <div className="text-[13px] font-bold mb-1">{problem ? '⚠ พบปัญหา — แก้ก่อนนำเข้า' : `✓ พร้อมนำเข้า ${summary.ready} เครื่อง`}</div>
          <div className="text-[12px] text-[#3C4A5E]">ทั้งหมด {summary.total} แถว</div>
          {summary.blanks.length > 0 && <div className="text-[12px] text-[#B0272F] mt-1">• แถวไม่มี Serial: แถวที่ {summary.blanks.join(', ')}</div>}
          {summary.inFileDups.length > 0 && <div className="text-[12px] text-[#B0272F] mt-1">• ซ้ำกันในไฟล์: {summary.inFileDups.join(', ')}</div>}
          {summary.systemDups.length > 0 && <div className="text-[12px] text-[#B0272F] mt-1">• มีในระบบแล้ว: {summary.systemDups.join(', ')}</div>}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={preview} disabled={busy || !canSubmit()}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-50">
          {busy ? 'กำลังตรวจ…' : '🔍 ตรวจ (พรีวิว)'}
        </button>
        <button type="button" onClick={commit} disabled={busy || !summary || !!problem}
          className="text-[13px] font-semibold px-5 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E] disabled:opacity-50">
          ⬆ ยืนยันนำเข้า
        </button>
      </div>
    </div>
  )
}

// ตารางกรอก/วาง Serial ในหน้า — วางทั้งก้อนได้ (กล่องวาง หรือ Ctrl+V ที่ช่องไหนก็ได้), Enter ไปแถวถัดไป, เตือน Serial ซ้ำ
function ManualGrid({ rows, sharedDate, onSharedDate, onChange }: {
  rows: MRow[]; sharedDate: string; onSharedDate: (d: string) => void; onChange: (r: MRow[]) => void
}) {
  const [bulk, setBulk] = useState('')
  const [count, setCount] = useState(String(rows.length))
  const [msg, setMsg] = useState('')
  // แถวที่จะโฟกัสหลังตารางเปลี่ยน (เช่น Enter ที่แถวสุดท้าย → เพิ่มแถวแล้วโฟกัสแถวใหม่)
  const focusNext = useRef<number | null>(null)
  useEffect(() => {
    if (focusNext.current == null) return
    document.getElementById(`imp-sn-${focusNext.current}`)?.focus()
    focusNext.current = null
  }, [rows])
  function focusRow(i: number) {
    const el = document.getElementById(`imp-sn-${i}`)
    if (el) el.focus(); else focusNext.current = i
  }

  function flash(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  const keyCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) { const k = r.sn.trim().toLowerCase(); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    return m
  }, [rows])
  const filled = rows.filter((r) => r.sn.trim()).length
  const dupCount = [...keyCount.values()].filter((c) => c > 1).length
  const empty = rows.length - filled

  const set = (i: number, patch: Partial<MRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))

  // วางหลายบรรทัดลงตั้งแต่แถว start (แถวไม่พอจะเพิ่มให้)
  function pasteAt(start: number, text: string) {
    const list = parseBlock(text, sharedDate)
    if (!list.length) return
    const next = [...rows]
    list.forEach((r, k) => { next[start + k] = r })
    onChange(Array.from(next, (r) => r ?? { sn: '', d: sharedDate }))
    flash(`วางแล้ว ${list.length} แถว`)
  }
  function onCellPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (!/[\n\t]/.test(text)) return // ค่าเดียว — ให้วางตามปกติ
    e.preventDefault()
    pasteAt(i, text)
  }

  function fromBulk(mode: 'replace' | 'append') {
    const list = parseBlock(bulk, sharedDate)
    if (!list.length) { flash('ยังไม่ได้วางข้อมูลในกล่อง'); return }
    onChange(mode === 'replace' ? list : [...rows.filter((r) => r.sn.trim()), ...list])
    setBulk('')
    flash(mode === 'replace' ? `ใส่ลงตาราง ${list.length} แถว` : `ต่อท้าย ${list.length} แถว`)
  }

  function makeRows() {
    const n = Math.min(500, Math.max(1, Math.trunc(Number(count) || 1)))
    const next = rows.slice(0, n)
    while (next.length < n) next.push({ sn: '', d: sharedDate })
    focusNext.current = 0
    onChange(next)
  }

  const small = 'text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border'

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* กล่องวางทั้งก้อน */}
      <div className="flex flex-col gap-2 rounded-lg border-[1.5px] border-dashed border-[var(--brand)] bg-[#FFF6EF] p-3">
        <div className="text-[13px] font-bold text-[#1C1917]">📋 วางทั้งหมดที่นี่
          <span className="block text-[11.5px] font-normal text-[#8492A6] mt-0.5">ก๊อปคอลัมน์ Serial (หรือ Serial + วันรับเข้า 2 คอลัมน์) จาก Excel / Google Sheet / LINE ทั้งก้อน แล้วกด Ctrl+V ในกล่องนี้</span>
        </div>
        <textarea value={bulk} rows={4}
          onChange={(e) => { const v = e.target.value; const grew = v.length - bulk.length > 1; setBulk(v); if (grew) { const n = parseBlock(v, sharedDate).length; if (n > 1) flash(`พบ ${n} แถว กด "ใส่ลงตาราง" ได้เลย`) } }}
          placeholder={'วางตรงนี้ เช่น\nCSH6186521300377-H\t26/10/2569\nCSH6186521300258-H'}
          className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] font-mono bg-white outline-none focus:border-[var(--brand)] resize-y" />
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => fromBulk('replace')} className={`${small} bg-[var(--brand)] text-white border-[var(--brand)] hover:bg-[var(--brand-strong)]`}>ใส่ลงตาราง (แทนที่ทั้งหมด)</button>
          <button type="button" onClick={() => fromBulk('append')} className={`${small} bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]`}>ต่อท้ายตาราง</button>
        </div>
      </div>

      {/* วันรับเข้าร่วม + จำนวนแถว */}
      <div className="flex items-end gap-2 flex-wrap">
        <label className="flex flex-col gap-1 text-[11.5px] text-[#8492A6]">วันรับเข้า (ใช้ทุกแถว)
          <input type="date" value={sharedDate} onChange={(e) => onSharedDate(e.target.value)}
            className="border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] text-[#1C1917] bg-white outline-none focus:border-[var(--brand)]" />
        </label>
        <button type="button" onClick={() => { onChange(rows.map((r) => ({ ...r, d: sharedDate }))); flash('ตั้งวันรับเข้าให้ทุกแถวแล้ว') }}
          className={`${small} bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]`}>ใช้กับทุกแถว</button>
        <label className="flex flex-col gap-1 text-[11.5px] text-[#8492A6] ml-auto">จำนวนเครื่อง
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(e.target.value)}
            className="w-20 border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-[13px] text-[#1C1917] tnum bg-white outline-none focus:border-[var(--brand)]" />
        </label>
        <button type="button" onClick={makeRows} className={`${small} bg-white text-[var(--brand)] border-[var(--brand)] hover:bg-[#FFF3EC]`}>สร้างแถว</button>
      </div>

      {/* ตาราง */}
      <div className="overflow-x-auto rounded-lg border border-[#E1E8F2] bg-white">
        <table className="w-full text-[13px] min-w-[460px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-3 py-2 w-10 text-right">#</th>
              <th className="px-2 py-2">Serial NO.</th>
              <th className="px-2 py-2 w-[170px]">วันรับเข้า</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const dup = !!r.sn.trim() && (keyCount.get(r.sn.trim().toLowerCase()) ?? 0) > 1
              return (
                <tr key={i} className="border-b border-[#F7F8FA] last:border-0">
                  <td className="px-3 py-1 text-right text-[#A8A29E] tnum">{i + 1}</td>
                  <td className="px-1 py-1">
                    <input id={`imp-sn-${i}`} value={r.sn} placeholder="สแกน / พิมพ์ / วาง Serial"
                      onChange={(e) => set(i, { sn: e.target.value })}
                      onPaste={(e) => onCellPaste(i, e)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        if (i === rows.length - 1) { focusNext.current = i + 1; onChange([...rows, { sn: '', d: sharedDate }]) }
                        else focusRow(i + 1)
                      }}
                      className={`w-full rounded px-2 py-1 font-mono text-[13px] outline-none border ${dup ? 'border-[#C13540] bg-[#FBE4E4]' : 'border-transparent hover:border-[#E1E8F2] focus:border-[var(--brand)]'}`} />
                  </td>
                  <td className="px-1 py-1">
                    <input type="date" value={r.d} onChange={(e) => set(i, { d: e.target.value })}
                      onPaste={(e) => onCellPaste(i, e)}
                      className="w-full rounded px-2 py-1 text-[13px] outline-none border border-transparent hover:border-[#E1E8F2] focus:border-[var(--brand)]" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button type="button" title="ลบแถว" onClick={() => onChange(rows.length > 1 ? rows.filter((_, k) => k !== i) : [{ sn: '', d: sharedDate }])}
                      className="w-6 h-6 grid place-items-center rounded-md text-[12px] text-[#C4BFB9] hover:text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => { focusNext.current = rows.length; onChange([...rows, { sn: '', d: sharedDate }]) }}
          className={`${small} bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]`}>＋ เพิ่มแถว</button>
        <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2F3EA] text-[#157F4C]">พร้อมนำเข้า {filled} เครื่อง</span>
        {dupCount > 0 && <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#FBE4E4] text-[#C13540]">Serial ซ้ำ {dupCount} เลข</span>}
        {empty > 0 && <span className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border border-[#E1E8F2] text-[#8492A6]">แถวว่าง {empty} (ข้าม)</span>}
        {msg && <span className="text-[12px] font-semibold text-[#157F4C]">{msg}</span>}
      </div>
      <div className="text-[11.5px] text-[#A8A29E] leading-relaxed">
        วางทั้งก้อนได้ 2 ทาง: ใช้กล่อง &quot;วางทั้งหมดที่นี่&quot; หรือคลิกช่องไหนก็ได้ในตารางแล้วกด Ctrl+V ข้อมูลจะลงตั้งแต่แถวนั้นลงไป · กด Enter ไปแถวถัดไป (ใช้กับเครื่องสแกนได้) · แถวที่ว่างจะถูกข้าม
      </div>
    </div>
  )
}
