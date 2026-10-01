'use client'
import { useMemo, useRef, useState } from 'react'

type LotOpt = { id: string; lotCode: string }
type ProductOpt = { id: string; group: string; name: string; lots: LotOpt[] }
type ParsedRow = { serialNo: string; receivedDate: string | null }
type Summary = { total: number; ready: number; blanks: number[]; inFileDups: string[]; systemDups: string[] }

const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--brand)]'
const NEW = '__new__'

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
    if (!effGroup || !effName || serialCol < 0) return false
    const lotOk = (lotSel && lotSel !== NEW) || lotNew.trim()
    return !!lotOk
  }

  async function preview() {
    setErr(''); setOk(null)
    const r = buildRows()
    if (!r.length) { setErr('ไม่พบข้อมูลในไฟล์/ชีต'); return }
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
          <button onClick={() => { setOk(null); resetGrid(); setSrcLabel(''); setSheetUrl(''); if (fileRef.current) fileRef.current.value = '' }}
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

      {/* 3. แหล่งข้อมูล: ไฟล์ หรือ Google Sheet */}
      <div className="flex flex-col gap-2 bg-[#F8FAFD] border border-[#EEF2F8] rounded-lg p-3">
        <div className="text-[12.5px] font-semibold text-[#5A6B82]">ข้อมูล (1 แถว = 1 เครื่อง · คอลัมน์: Serial NO. + วันรับเข้า)</div>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-dashed border-[#B9C2CF] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          📄 เลือกไฟล์ Excel / CSV
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-[#96A2B5]">หรือ</span>
          <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="วางลิงก์ Google Sheet (แชร์แบบทุกคนที่มีลิงก์ดูได้)" className={`${field} flex-1`} />
          <button type="button" onClick={fetchSheet} disabled={busy || !sheetUrl.trim()}
            className="text-[13px] font-semibold px-3 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-50 shrink-0">ดึงข้อมูล</button>
        </div>
        {srcLabel && <div className="text-[11.5px] text-[#157F4C] font-semibold">โหลดจาก: {srcLabel} · {grid.length} แถว</div>}
      </div>

      {/* เลือกคอลัมน์ */}
      {headers.length > 0 && (
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
