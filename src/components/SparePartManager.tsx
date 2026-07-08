'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = {
  id: string; name: string; category: string | null; stockQty: number
  sellPrice: number | null; serviceFee1: number | null; serviceFee2: number | null
  requiresOnsite: boolean; remark: string | null
}
type PatchBody = Partial<Omit<Item, 'id'>> & { stockDelta?: number }

const baht = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const money = (n: number | null) => (n == null ? '—' : `${baht.format(n)} ฿`)

export function SparePartManager({ initial }: { initial: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [q, setQ] = useState('')

  // add-form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [stockQty, setStockQty] = useState('0')
  const [sellPrice, setSellPrice] = useState('')
  const [serviceFee1, setServiceFee1] = useState('')
  const [serviceFee2, setServiceFee2] = useState('')
  const [requiresOnsite, setRequiresOnsite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    if (!name.trim()) { setErr('ระบุชื่ออะไหล่'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/spare-parts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, stockQty, sellPrice, serviceFee1, serviceFee2, requiresOnsite }),
      })
      if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
      setName(''); setCategory(''); setStockQty('0'); setSellPrice(''); setServiceFee1(''); setServiceFee2(''); setRequiresOnsite(false)
      router.refresh()
    } finally { setSaving(false) }
  }

  async function patch(id: string, body: PatchBody) {
    const res = await fetch(`/api/spare-parts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) { const u = await res.json(); setItems((x) => x.map((it) => (it.id === id ? { ...it, ...u, sellPrice: u.sellPrice == null ? null : Number(u.sellPrice), serviceFee1: u.serviceFee1 == null ? null : Number(u.serviceFee1), serviceFee2: u.serviceFee2 == null ? null : Number(u.serviceFee2) } : it))); router.refresh() }
  }

  async function remove(id: string) {
    if (!window.confirm('ลบอะไหล่รายการนี้?')) return
    const res = await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'
  const shown = q.trim() ? items.filter((i) => (i.name + ' ' + (i.category ?? '')).toLowerCase().includes(q.trim().toLowerCase())) : items
  const lowStock = items.filter((i) => i.stockQty <= 0).length

  return (
    <div className="flex flex-col gap-4">
      {/* add form */}
      <div className="ds-card p-5">
        <div className="text-[15px] font-bold mb-4">เพิ่มอะไหล่</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่ออะไหล่</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Smartcard Reader uTrust2700RB" className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">หมวด/รายการการตลาด (ถ้ามี)</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">จำนวนคงเหลือในคลัง</label>
            <input type="number" min={0} value={stockQty} onChange={(e) => setStockQty(e.target.value)} className={`${field} tnum`} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ราคาขายลูกค้า/ชิ้น (บาท)</label>
            <input type="number" min={0} step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className={`${field} tnum`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ค่าช่าง 1 คน/วัน</label>
              <input type="number" min={0} step="0.01" value={serviceFee1} onChange={(e) => setServiceFee1(e.target.value)} className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ค่าช่าง 2 คน/วัน</label>
              <input type="number" min={0} step="0.01" value={serviceFee2} onChange={(e) => setServiceFee2(e.target.value)} className={`${field} tnum`} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#5A6B82]">
            <input type="checkbox" checked={requiresOnsite} onChange={(e) => setRequiresOnsite(e.target.checked)} className="w-4 h-4 accent-[#EA580C]" />
            บังคับช่างเข้าหน้างานเปลี่ยน
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button onClick={add} disabled={saving}
              className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
              {saving ? 'กำลังบันทึก…' : 'เพิ่มอะไหล่'}
            </button>
            {err && <span className="text-sm text-[#C13540]">{err}</span>}
          </div>
        </div>
      </div>

      {/* summary + search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[13px] text-[#5A6B82]">
          ทั้งหมด <span className="font-bold text-[#1C1917]">{items.length}</span> รายการ
          {lowStock > 0 && <span className="ml-2 text-[#C13540] font-semibold">· สต็อกหมด {lowStock} รายการ</span>}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาอะไหล่…"
          className="border border-[#D6DFEA] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#EA580C] w-full sm:w-64" />
      </div>

      {/* list */}
      <div className="flex flex-col gap-3">
        {shown.length === 0 && <div className="ds-card p-6 text-sm text-[#8492A6]">ไม่มีรายการ</div>}
        {shown.map((it) => <PartCard key={it.id} item={it} onPatch={(b) => patch(it.id, b)} onDelete={() => remove(it.id)} />)}
      </div>
    </div>
  )
}

function PartCard({ item, onPatch, onDelete }: { item: Item; onPatch: (b: PatchBody) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category ?? '')
  const [sellPrice, setSellPrice] = useState(item.sellPrice != null ? String(item.sellPrice) : '')
  const [serviceFee1, setServiceFee1] = useState(item.serviceFee1 != null ? String(item.serviceFee1) : '')
  const [serviceFee2, setServiceFee2] = useState(item.serviceFee2 != null ? String(item.serviceFee2) : '')
  const [requiresOnsite, setRequiresOnsite] = useState(item.requiresOnsite)

  const low = item.stockQty <= 0
  const inp = 'border border-[#D6DFEA] rounded-lg px-2 py-1.5 text-[13px] tnum outline-none focus:border-[#EA580C]'

  function save() {
    onPatch({ name: name.trim() || item.name, category: category.trim() || null, sellPrice: sellPrice.trim() === '' ? null : Number(sellPrice), serviceFee1: serviceFee1.trim() === '' ? null : Number(serviceFee1), serviceFee2: serviceFee2.trim() === '' ? null : Number(serviceFee2), requiresOnsite })
    setEdit(false)
  }

  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[#1C1917]">{item.name}</div>
          {item.category && <div className="text-[12.5px] text-[#8492A6]">{item.category}</div>}
          <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[13px]">
            <span className="text-[#5A6B82]">ขาย <span className="font-semibold text-[#1C1917]">{money(item.sellPrice)}</span></span>
            {item.serviceFee1 != null && <span className="text-[#5A6B82]">· ช่าง1คน {money(item.serviceFee1)}</span>}
            {item.serviceFee2 != null && <span className="text-[#5A6B82]">· ช่าง2คน {money(item.serviceFee2)}</span>}
            {item.requiresOnsite && <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#E9EAFB] text-[#3B45C4]">ต้อง Onsite</span>}
          </div>
        </div>
        {/* stock control */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => onPatch({ stockDelta: -1 })} className="w-8 h-8 rounded-lg bg-[#F0EEEC] text-[#57534E] font-bold hover:bg-[#E7E4E1]">−</button>
            <div className="text-center min-w-[64px]">
              <div className={`text-xl font-bold tnum ${low ? 'text-[#C13540]' : 'text-[#157F4C]'}`}>{item.stockQty}</div>
              <div className="text-[10px] text-[#A8A29E] -mt-0.5">คงเหลือ</div>
            </div>
            <button onClick={() => onPatch({ stockDelta: 1 })} className="w-8 h-8 rounded-lg bg-[#F0EEEC] text-[#57534E] font-bold hover:bg-[#E7E4E1]">+</button>
          </div>
          <button onClick={() => setEdit((e) => !e)} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✎</button>
          <button onClick={onDelete} className="w-8 h-8 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
        </div>
      </div>

      {edit && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่ออะไหล่" className={inp + ' md:col-span-2'} />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="หมวด/รายการการตลาด" className={inp + ' md:col-span-2'} />
          <input type="number" min={0} step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="ราคาขาย/ชิ้น" className={inp} />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="number" min={0} step="0.01" value={serviceFee1} onChange={(e) => setServiceFee1(e.target.value)} placeholder="ค่าช่าง 1 คน" className={inp} />
            <input type="number" min={0} step="0.01" value={serviceFee2} onChange={(e) => setServiceFee2(e.target.value)} placeholder="ค่าช่าง 2 คน" className={inp} />
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#5A6B82]">
            <input type="checkbox" checked={requiresOnsite} onChange={(e) => setRequiresOnsite(e.target.checked)} className="w-4 h-4 accent-[#EA580C]" />
            บังคับช่างเข้าหน้างาน
          </label>
          <div className="md:col-span-2">
            <button onClick={save} className="bg-[#EA580C] text-white text-[13px] font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C]">บันทึก</button>
          </div>
        </div>
      )}
    </div>
  )
}
