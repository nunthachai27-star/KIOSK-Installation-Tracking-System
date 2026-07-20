'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type UserOpt = { id: string; name: string }
type TaskItem = {
  id: string; title: string; kind: string; hospitalName: string | null
  owner: string | null; startDate: string; endDate: string | null
}

const dFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtD = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : dFmt.format(d) }

export function TaskManager({ users, kinds, initial, today }: { users: UserOpt[]; kinds: readonly string[]; initial: TaskItem[]; today: string }) {
  const router = useRouter()
  const [items, setItems] = useState<TaskItem[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState(kinds[0] ?? 'อื่นๆ')
  const [hospitalName, setHospitalName] = useState('')
  const [responsibleUserId, setResponsibleUserId] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    if (!title.trim()) { setErr('ระบุรายละเอียดงาน'); return }
    if (!startDate) { setErr('ระบุวันที่เริ่มต้น'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, kind, hospitalName, responsibleUserId: responsibleUserId || null, startDate, endDate: endDate || null }),
      })
      if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
      setTitle(''); setHospitalName(''); setResponsibleUserId(''); setEndDate('')
      router.refresh()
    } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!window.confirm('ลบงานนี้?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition'

  return (
    <div className="flex flex-col gap-4">
      <div className="ds-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-[#F3EEFF] text-[#6D28D9] grid place-items-center">🔔</span>
          <span className="text-[15px] font-bold">เพิ่มการแจ้งเตือนงาน (งานอื่นๆ)</span>
        </div>
        <p className="text-[12.5px] text-[#8492A6] mb-4 ml-10 -mt-0.5">งานนอกเหนือ ORDER ส่งของ เช่น ประชุม · ติดตามงาน รพ. · อบรม — จะแสดงบนหน้า Monitor ตามช่วงวันที่</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รายละเอียดงาน</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ประชุมทีมติดตั้ง, ติดตามงาน รพ.สมเด็จ, อบรมการใช้งาน…" className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ประเภทงาน</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่อโรงพยาบาล (ถ้ามี)</label>
            <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="เว้นว่างได้ถ้าเป็นงานภายใน" className={field} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ผู้รับผิดชอบ</label>
            <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className={field}>
              <option value="">— ไม่ระบุ —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันที่เริ่มต้น</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันที่สิ้นสุด</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
            </div>
          </div>
        </div>
        {err && <div className="text-sm text-[#C13540] mt-2">{err}</div>}
        <button onClick={add} disabled={saving}
          className="ds-hover mt-4 bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
          {saving ? 'กำลังบันทึก…' : '＋ เพิ่มการแจ้งเตือนงาน'}
        </button>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#EEF3FA] text-[#5A6B82] grid place-items-center text-[14px]">📋</span>
          <span className="text-[15px] font-bold">งานอื่นๆ ที่บันทึกไว้</span>
          <span className="text-[12.5px] text-[#8492A6] font-normal">· {items.length} งาน</span>
        </div>
        {items.length === 0 && (
          <div className="grid place-items-center text-center py-12 px-5 border-t border-[#F1F3F6]">
            <span className="w-14 h-14 rounded-2xl bg-[#F6F4F2] grid place-items-center text-[24px] mb-2.5">📄</span>
            <div className="text-[13.5px] font-semibold text-[#57534E]">ยังไม่มีงานอื่นๆ ที่บันทึกไว้</div>
            <div className="text-[12px] text-[#8492A6] mt-1">เพิ่มการแจ้งเตือนงาน เพื่อให้แสดงในหน้า Monitor</div>
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className="ds-hover flex items-center gap-3 px-5 py-3 border-t border-[#EEF2F8] hover:bg-[#F8FAFD]">
            <span className="w-9 h-9 rounded-lg grid place-items-center text-[18px] shrink-0" style={{ background: '#7C3AED2E' }}>📌</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#1C1917] truncate">{it.title}</div>
              <div className="text-[12.5px] text-[#8492A6]">
                {it.kind}{it.hospitalName ? ` · ${it.hospitalName}` : ''}{it.owner ? ` · ${it.owner}` : ''}
              </div>
            </div>
            <div className="text-[12.5px] text-[#5A6B82] text-right shrink-0">
              {fmtD(it.startDate)}{it.endDate && it.endDate !== it.startDate ? ` – ${fmtD(it.endDate)}` : ''}
            </div>
            <button onClick={() => del(it.id)} className="w-7 h-7 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4] shrink-0">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
