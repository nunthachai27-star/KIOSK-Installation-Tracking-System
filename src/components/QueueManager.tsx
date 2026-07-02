'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type JobOpt = { id: string; label: string }
type UserOpt = { id: string; name: string }
type TypeOpt = { key: string; label: string }
type Item = { id: string; time: string; typeLabel: string; product: string; hospital: string; staff: string }

export function QueueManager({
  jobs, users, types, initial, date,
}: { jobs: JobOpt[]; users: UserOpt[]; types: TypeOpt[]; initial: Item[]; date: string }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
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

  const field = 'border border-[#D6DFEA] rounded-xl px-3 py-2.5 outline-none focus:border-[#2F6BED] focus:ring-2 focus:ring-[#2F6BED]/15 transition'

  return (
    <div className="flex flex-col gap-4">
      <div className="ds-card p-5">
        <div className="text-[15px] font-bold mb-4">เพิ่มคิวงาน</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={`${field} md:col-span-2`}>
            <option value="">— เลือกงาน (รพ. · สินค้า) —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
            {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={field}>
            <option value="">— ผู้รับผิดชอบ —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </div>
        {err && <div className="text-sm text-[#C13540] mt-2">{err}</div>}
        <button onClick={add} disabled={saving}
          className="ds-hover mt-4 bg-[#2F6BED] text-white font-semibold rounded-xl px-5 py-2.5 hover:bg-[#1E51D0] disabled:opacity-60">
          {saving ? 'กำลังเพิ่ม…' : '＋ เพิ่มเข้าคิว'}
        </button>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="px-5 pt-4 pb-1.5 text-[15px] font-bold">คิววันที่ {date} · {items.length} งาน</div>
        {items.length === 0 && <div className="px-5 py-6 text-sm text-[#8492A6]">ยังไม่มีคิวในวันนี้</div>}
        {items.map((it) => (
          <div key={it.id} className="ds-hover grid grid-cols-[70px_1.2fr_1.3fr_1fr_60px] items-center gap-2 px-5 py-3 border-t border-[#EEF2F8] hover:bg-[#F8FAFD]">
            <div className="font-bold tnum text-[#12233B]">{it.time}</div>
            <div className="text-sm font-semibold">{it.typeLabel}<div className="text-xs text-[#8492A6] font-normal">{it.product}</div></div>
            <div className="text-sm">{it.hospital}</div>
            <div className="text-sm text-[#3C4A5E]">{it.staff}</div>
            <button onClick={() => del(it.id)} className="justify-self-end w-7 h-7 grid place-items-center rounded-md text-[#C13540] hover:bg-[#FBE4E4]">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
