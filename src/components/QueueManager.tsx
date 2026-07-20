'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type JobOpt = { id: string; label: string; date?: string }
type UserOpt = { id: string; name: string }
type TypeOpt = { key: string; label: string }
type Item = { id: string; time: string; typeLabel: string; product: string; hospital: string; staff: string }

export function QueueManager({
  jobs, users, types, initial, date, today, children,
}: { jobs: JobOpt[]; users: UserOpt[]; types: TypeOpt[]; initial: Item[]; date: string; today: string; children?: ReactNode }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  useEffect(() => { setItems(initial) }, [initial])
  const [jobId, setJobId] = useState('')
  const [type, setType] = useState(types[0]?.key ?? '')
  const [when, setWhen] = useState(date)
  const [time, setTime] = useState('09:00')
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    if (!jobId) { setErr('เลือกงานก่อน'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, activityType: type, date: when, time, responsibleUserId: userId || null }),
      })
      if (!res.ok) { setErr('เพิ่มคิวไม่สำเร็จ'); return }
      const job = jobs.find((j) => j.id === jobId)
      const item: Item = {
        id: (await res.json()).id,
        time,
        typeLabel: types.find((t) => t.key === type)?.label ?? type,
        product: job?.label.split(' · ')[2] ?? '',
        hospital: job?.label.split(' · ')[1] ?? '',
        staff: users.find((u) => u.id === userId)?.name ?? '—',
      }
      if (when === date) setItems((x) => [...x, item].sort((a, b) => a.time.localeCompare(b.time)))
      setJobId('')
      router.refresh()
    } finally { setSaving(false) }
  }

  async function del(id: string) {
    const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' })
    if (res.ok) { setItems((x) => x.filter((i) => i.id !== id)); router.refresh() }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition'
  const label = 'block text-[13px] font-semibold text-[#5A6B82] mb-1.5'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_336px] gap-4 items-start">
      {/* left column: queue form + (task manager passed as children) */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="ds-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-[#FFEDE1] text-[#EA580C] grid place-items-center">📅</span>
            <span className="text-[15px] font-bold">เพิ่มคิวงาน</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className={label}>เลือกงาน (รพ. · สินค้า)</label>
              <select value={jobId} onChange={(e) => { const id = e.target.value; setJobId(id); const d = jobs.find((j) => j.id === id)?.date; if (d) setWhen(d) }} className={field}>
                <option value="">— เลือกงาน (รพ. · สินค้า) —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>ประเภทงาน</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>ผู้รับผิดชอบ</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={field}>
                <option value="">— ผู้รับผิดชอบ —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>วันที่</label>
              <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>เวลา</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
            </div>
            <div className="flex items-end">
              <button onClick={add} disabled={saving}
                className="ds-hover w-full bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
                {saving ? 'กำลังเพิ่ม…' : '＋ เพิ่มเข้าคิว'}
              </button>
            </div>
          </div>
          <div className="text-xs text-[#8492A6] mt-2.5">วันที่จะเติมจากงานให้อัตโนมัติ (กำหนดส่ง/วันสัญญา) — แก้ไขได้</div>
          {err && <div className="text-sm text-[#C13540] mt-2">{err}</div>}
        </div>

        {children}
      </div>

      {/* right column: the selected day's queue */}
      <div className="ds-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-[#F1F3F6]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#FFEDE1] text-[#EA580C] grid place-items-center">📅</span>
            <span className="text-[14px] font-bold">คิววันที่ {date}</span>
          </div>
          <input type="date" value={date} onChange={(e) => { if (e.target.value) router.push(`/schedule?d=${e.target.value}`) }}
            className="border border-[#D6DFEA] rounded-lg px-2 py-1 text-[12px] outline-none focus:border-[#EA580C]" aria-label="เลือกวันที่คิว" />
        </div>
        {items.length === 0 ? (
          <div className="grid place-items-center text-center py-16 px-5">
            <span className="w-16 h-16 rounded-2xl bg-[#FFF4EC] grid place-items-center text-[28px] mb-3">📅</span>
            <div className="text-[14px] font-semibold text-[#57534E]">ยังไม่มีคิวในวันนี้</div>
            <div className="text-[12.5px] text-[#8492A6] mt-1">เพิ่มคิวงานแรกเพื่อเริ่มจัดลำดับงาน</div>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex gap-3 px-4 py-3 border-t border-[#F1F3F6] first:border-t-0 hover:bg-[#FBFAF8]">
              <div className="w-14 shrink-0 text-[13px] font-bold tnum text-[#EA580C]">{it.time}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1C1917] truncate">{it.typeLabel}</div>
                <div className="text-[11.5px] text-[#8492A6] truncate">{[it.hospital, it.product].filter(Boolean).join(' · ')}</div>
                <div className="text-[11.5px] text-[#5A6B82] mt-0.5">👤 {it.staff}</div>
              </div>
              <button onClick={() => del(it.id)} className="w-7 h-7 shrink-0 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4] self-start">✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
