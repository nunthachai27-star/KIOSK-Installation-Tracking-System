'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScanButton } from './ScanButton'

type ProductOpt = { id: string; group: string; name: string; unit: string }
type Row = { serialNo: string; color: string }

const emptyRow = (): Row => ({ serialNo: '', color: '' })

export function StockReceiveForm({ products, groups }: { products: ProductOpt[]; groups: string[] }) {
  const router = useRouter()
  // product selection
  const [mode, setMode] = useState<'existing' | 'new'>(products.length ? 'existing' : 'new')
  const [productId, setProductId] = useState('')
  const [ngGroup, setNgGroup] = useState('')
  const [ngName, setNgName] = useState('')
  const [ngUnit, setNgUnit] = useState('เครื่อง')
  const [ngLow, setNgLow] = useState('3')

  // lot
  const [lotCode, setLotCode] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [note, setNote] = useState('')

  // items
  const [itemMode, setItemMode] = useState<'serial' | 'qty'>('serial')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [qty, setQty] = useState('')
  const [qtyColor, setQtyColor] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15'
  const label = 'block text-[13px] font-semibold text-[#5A6B82] mb-1.5'

  function applyPaste() {
    // one unit per line, optional "serialNo, color" comma-separated
    const parsed = pasteText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [a, b] = l.split(/[,\t]/).map((x) => (x ?? '').trim())
      return { serialNo: a ?? '', color: b ?? '' }
    })
    if (parsed.length) setRows(parsed)
    setPasteOpen(false); setPasteText('')
  }

  async function submit() {
    setErr(''); setOk('')
    if (mode === 'existing' && !productId) { setErr('เลือกรุ่นสินค้า'); return }
    if (mode === 'new' && (!ngGroup.trim() || !ngName.trim())) { setErr('ระบุกลุ่มและชื่อรุ่นใหม่'); return }
    if (!lotCode.trim()) { setErr('ระบุ Lot'); return }
    const validRows = rows.filter((r) => r.serialNo.trim() || r.color.trim())
    if (itemMode === 'serial' && !validRows.length) { setErr('ใส่อย่างน้อย 1 เลขเครื่อง (Serial NO.)'); return }
    if (itemMode === 'qty' && !(Number(qty) > 0)) { setErr('ระบุจำนวน'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/stock/receive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: mode === 'existing' ? productId : undefined,
          newProduct: mode === 'new' ? { group: ngGroup, name: ngName, unit: ngUnit, lowStockQty: Number(ngLow) } : undefined,
          lotCode, receivedDate: receivedDate || undefined, note: note || undefined,
          items: itemMode === 'serial' ? validRows : undefined,
          quantity: itemMode === 'qty' ? Number(qty) : undefined,
          color: itemMode === 'qty' ? qtyColor : undefined,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr(d?.message || 'บันทึกไม่สำเร็จ'); return }
      const data = await res.json()
      setOk(`บันทึกรับเข้าคลังสำเร็จ ${data.count} เครื่อง`)
      // reset lot/items, keep product selection for consecutive lots
      setLotCode(''); setNote(''); setRows([emptyRow()]); setQty(''); setQtyColor('')
      router.refresh()
    } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. product */}
      <div className="ds-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-[#E4EEFF] text-[#1B5FD9] grid place-items-center text-[13px] font-bold">1</span>
          <span className="text-[15px] font-bold">รุ่นสินค้า</span>
        </div>
        <div className="inline-flex rounded-lg border border-[#D6DFEA] overflow-hidden mb-3">
          <button type="button" onClick={() => setMode('existing')} disabled={!products.length}
            className={`px-4 py-2 text-[13px] font-semibold ${mode === 'existing' ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1] disabled:opacity-40'}`}>เลือกรุ่นที่มีอยู่</button>
          <button type="button" onClick={() => setMode('new')}
            className={`px-4 py-2 text-[13px] font-semibold ${mode === 'new' ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>＋ สร้างรุ่นใหม่</button>
        </div>
        {mode === 'existing' ? (
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={field}>
            <option value="">— เลือกรุ่นสินค้า —</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {products.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>กลุ่มสินค้า</label>
              <input value={ngGroup} onChange={(e) => setNgGroup(e.target.value)} list="stock-groups" placeholder="เช่น Smart Kiosk, Mini Kiosk" className={field} />
              <datalist id="stock-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            </div>
            <div>
              <label className={label}>ชื่อรุ่น/อุปกรณ์</label>
              <input value={ngName} onChange={(e) => setNgName(e.target.value)} placeholder="เช่น ตู้ Kiosk Hi-End" className={field} />
            </div>
            <div>
              <label className={label}>หน่วยนับ</label>
              <input value={ngUnit} onChange={(e) => setNgUnit(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>แจ้งเตือนใกล้หมดเมื่อเหลือ ≤</label>
              <input type="number" min={0} value={ngLow} onChange={(e) => setNgLow(e.target.value)} className={field} />
            </div>
          </div>
        )}
      </div>

      {/* 2. lot */}
      <div className="ds-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-[#E4EEFF] text-[#1B5FD9] grid place-items-center text-[13px] font-bold">2</span>
          <span className="text-[15px] font-bold">Lot ที่รับเข้า</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={label}>รหัส Lot</label>
            <input value={lotCode} onChange={(e) => setLotCode(e.target.value)} placeholder="เช่น 1/69" className={field} />
          </div>
          <div>
            <label className={label}>วันที่รับเข้า</label>
            <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>หมายเหตุ (ถ้ามี)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          </div>
        </div>
      </div>

      {/* 3. items */}
      <div className="ds-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#E4EEFF] text-[#1B5FD9] grid place-items-center text-[13px] font-bold">3</span>
            <span className="text-[15px] font-bold">รายการเครื่อง</span>
          </div>
          <div className="inline-flex rounded-lg border border-[#D6DFEA] overflow-hidden">
            <button type="button" onClick={() => setItemMode('serial')} className={`px-3 py-1.5 text-[12.5px] font-semibold ${itemMode === 'serial' ? 'bg-[#1C1917] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>ระบุเลขเครื่องรายตัว</button>
            <button type="button" onClick={() => setItemMode('qty')} className={`px-3 py-1.5 text-[12.5px] font-semibold ${itemMode === 'qty' ? 'bg-[#1C1917] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>ระบุจำนวน</button>
          </div>
        </div>

        <div className="text-[12px] text-[#8492A6] mb-2.5 -mt-1">💡 S/N BMS จะถูกกำหนดอัตโนมัติเมื่อจ่ายออกให้โรงพยาบาล (สร้างงาน) — ตอนรับเข้าคลังบันทึกเฉพาะเลขเครื่องจากโรงงานและสี</div>

        {itemMode === 'serial' ? (
          <div className="flex flex-col gap-2">
            <div className="hidden md:grid grid-cols-[32px_1fr_160px_32px] gap-2 text-[11px] font-semibold text-[#A8A29E] px-1">
              <div>#</div><div>Serial NO. (เลขเครื่องจากโรงงาน)</div><div>สี</div><div />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[32px_1fr_160px_32px] gap-2 items-center">
                <div className="text-[12px] text-[#A8A29E] tnum text-center">{i + 1}</div>
                <div className="flex items-center gap-1.5">
                  <input value={r.serialNo} onChange={(e) => setRows((x) => x.map((v, j) => j === i ? { ...v, serialNo: e.target.value } : v))} placeholder="เลขเครื่อง" className="flex-1 min-w-0 border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] tnum outline-none focus:border-[#EA580C]" />
                  <ScanButton className="w-9 h-9 shrink-0 grid place-items-center rounded-lg border border-[#D6DFEA] hover:bg-[#F4F3F1]"
                    onScan={(text) => setRows((x) => x.map((v, j) => j === i ? { ...v, serialNo: text } : v))} />
                </div>
                <input value={r.color} onChange={(e) => setRows((x) => x.map((v, j) => j === i ? { ...v, color: e.target.value } : v))} placeholder="สี" className="border border-[#D6DFEA] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[#EA580C]" />
                <button type="button" onClick={() => setRows((x) => x.length > 1 ? x.filter((_, j) => j !== i) : x)} className="w-7 h-7 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <button type="button" onClick={() => setRows((x) => [...x, emptyRow()])} className="text-[13px] font-semibold text-[#EA580C] hover:underline">＋ เพิ่มแถว</button>
              <span className="text-[#D8D3CE]">·</span>
              <button type="button" onClick={() => setPasteOpen((v) => !v)} className="text-[13px] font-semibold text-[#5A6B82] hover:underline">วางหลายรายการ</button>
              <span className="ml-auto text-[12px] text-[#8492A6]">{rows.filter((r) => r.serialNo.trim()).length} เครื่อง</span>
            </div>
            {pasteOpen && (
              <div className="mt-1 rounded-lg border border-[#EEEAE6] bg-[#FBFAF8] p-3">
                <div className="text-[12px] text-[#8492A6] mb-1.5">วาง 1 บรรทัด/เครื่อง — รูปแบบ: <span className="font-semibold">เลขเครื่อง</span> หรือ <span className="font-semibold">เลขเครื่อง, สี</span></div>
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4} className="w-full border border-[#D6DFEA] rounded-lg px-2.5 py-2 text-[13px] tnum outline-none focus:border-[#EA580C]" placeholder={'250900001, ฟ้า\n250900002'} />
                <button type="button" onClick={applyPaste} className="mt-2 bg-[#1C1917] text-white text-[12.5px] font-semibold rounded-lg px-3 py-1.5">ใช้รายการนี้</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>จำนวนที่รับเข้า</label>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="เช่น 40" className={field} />
            </div>
            <div>
              <label className={label}>สี (ถ้ามี)</label>
              <input value={qtyColor} onChange={(e) => setQtyColor(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2 text-[12px] text-[#8492A6]">โหมดจำนวน: ระบบจะสร้างเครื่องในคลังตามจำนวน (ยังไม่มี Serial) — เหมาะกับอุปกรณ์ที่ไม่ track Serial</div>
          </div>
        )}
      </div>

      {err && <div className="text-sm text-[#C13540]">{err}</div>}
      {ok && <div className="text-sm text-[#157F4C] font-semibold">✓ {ok}</div>}
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={saving}
          className="ds-hover bg-[#EA580C] text-white font-semibold rounded-lg px-6 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
          {saving ? 'กำลังบันทึก…' : '📥 บันทึกรับเข้าคลัง'}
        </button>
      </div>
    </div>
  )
}
