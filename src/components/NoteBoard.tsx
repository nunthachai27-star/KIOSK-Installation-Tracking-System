'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

type Note = {
  id: string; title: string | null; body: string; color: string; pinned: boolean
  link: string | null; remindAt: string | null; authorName: string | null; createdAt: string
}
type FormState = { title: string; body: string; color: string; pinned: boolean; link: string; remindAt: string }

const COLORS: { key: string; bg: string; border: string; dot: string }[] = [
  { key: 'yellow', bg: '#FFF9DB', border: '#F5E6A8', dot: '#EAB308' },
  { key: 'green', bg: '#E7F6EC', border: '#C6E8D2', dot: '#157F4C' },
  { key: 'blue', bg: '#E7F0FF', border: '#C7DBF7', dot: '#1B5FD9' },
  { key: 'pink', bg: '#FDE9F0', border: '#F6CADB', dot: '#DB2777' },
  { key: 'gray', bg: '#F1F3F6', border: '#E1E6EC', dot: '#64748B' },
]
const colorOf = (k: string) => COLORS.find((c) => c.key === k) ?? COLORS[0]

const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string | null) => (iso ? dFmt.format(new Date(iso)) : '')
const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// remind status vs today (date-only)
function remindState(iso: string | null): { text: string; color: string; bg: string } | null {
  if (!iso) return null
  const day = new Date(iso); day.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((day.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return { text: `⏰ เลยกำหนด ${fmt(iso)}`, color: '#C13540', bg: '#FBE4E4' }
  if (diff === 0) return { text: '⏰ เตือนวันนี้', color: '#B45309', bg: '#FBEBCB' }
  if (diff <= 3) return { text: `⏰ อีก ${diff} วัน (${fmt(iso)})`, color: '#B45309', bg: '#FBEEDD' }
  return { text: `⏰ ${fmt(iso)}`, color: '#5A6B82', bg: '#EEF1F5' }
}

const empty: FormState = { title: '', body: '', color: 'yellow', pinned: false, link: '', remindAt: '' }

export function NoteBoard({ initial }: { initial: Note[] }) {
  const router = useRouter()
  const notes = initial // use server data directly so router.refresh() reflects changes
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)

  const ql = q.trim().toLowerCase()
  const shown = useMemo(() => (ql
    ? notes.filter((n) => [n.title, n.body, n.link, n.authorName].some((v) => (v ?? '').toLowerCase().includes(ql)))
    : notes), [notes, ql])
  const pinned = shown.filter((n) => n.pinned)
  const rest = shown.filter((n) => !n.pinned)

  async function togglePin(n: Note) {
    const res = await fetch(`/api/notes/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: !n.pinned }) })
    if (res.ok) router.refresh()
  }
  async function remove(n: Note) {
    if (!(await confirmDialog({ title: 'ลบโน้ต', message: 'ลบโน้ตนี้?', danger: true, confirmText: 'ลบ' }))) return
    const res = await fetch(`/api/notes/${n.id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโน้ต, ผู้เขียน…"
            className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true) }}
          className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]">
          ＋ เพิ่มโน้ต
        </button>
      </div>

      {shown.length === 0 && (
        <div className="ds-card p-8 text-center text-[#8492A6] text-sm">
          {notes.length === 0 ? 'ยังไม่มีโน้ต — กด “＋ เพิ่มโน้ต” เพื่อเริ่ม' : 'ไม่พบโน้ตที่ค้นหา'}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[12.5px] font-bold text-[#8492A6]">📌 ปักหมุด</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinned.map((n) => <NoteCard key={n.id} n={n} onEdit={() => { setEditing(n); setFormOpen(true) }} onPin={() => togglePin(n)} onDelete={() => remove(n)} />)}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rest.map((n) => <NoteCard key={n.id} n={n} onEdit={() => { setEditing(n); setFormOpen(true) }} onPin={() => togglePin(n)} onDelete={() => remove(n)} />)}
        </div>
      )}

      {formOpen && <NoteForm editing={editing} onClose={() => setFormOpen(false)} onDone={() => { setFormOpen(false); router.refresh() }} />}
    </div>
  )
}

function NoteCard({ n, onEdit, onPin, onDelete }: { n: Note; onEdit: () => void; onPin: () => void; onDelete: () => void }) {
  const c = colorOf(n.color)
  const rs = remindState(n.remindAt)
  const [expanded, setExpanded] = useState(false)
  // Long notes are collapsed by default so cards line up tidily and stay scannable.
  const long = n.body.length > 200 || n.body.split('\n').length > 7
  const clampStyle = long && !expanded
    ? { display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
    : undefined
  return (
    <div className="rounded-2xl border p-3.5 flex flex-col gap-2 shadow-[0_1px_2px_rgba(18,45,90,.04)]" style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {n.title && <div className="text-[14px] font-bold text-[#1C1917] break-words">{n.title}</div>}
        </div>
        <button onClick={onPin} title={n.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          className={`text-[13px] leading-none ${n.pinned ? 'opacity-100' : 'opacity-35 hover:opacity-70'}`}>📌</button>
      </div>
      <div className="text-[13px] text-[#3C4A5E] whitespace-pre-wrap break-words" style={clampStyle}>{n.body}</div>
      {long && (
        <button onClick={() => setExpanded((v) => !v)} className="self-start text-[12px] font-semibold text-[#1B5FD9] hover:underline">
          {expanded ? '▴ ย่อ' : '▾ ดูเพิ่มเติม'}
        </button>
      )}
      {rs && <span className="self-start text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: rs.color, background: rs.bg }}>{rs.text}</span>}
      {n.link && (
        <a href={n.link} target="_blank" rel="noopener noreferrer"
          className="text-[12px] font-semibold text-[#1B5FD9] hover:underline break-all">🔗 {n.link}</a>
      )}
      <div className="flex items-center gap-2 mt-1 pt-2 border-t" style={{ borderColor: c.border }}>
        <span className="text-[11px] text-[#8492A6] flex-1 truncate">{n.authorName ?? '—'} · {fmt(n.createdAt)}</span>
        <button onClick={onEdit} className="text-[12px] font-semibold text-[#5A6B82] hover:text-[#EA580C]">✎ แก้ไข</button>
        <button onClick={onDelete} className="text-[12px] font-semibold text-[#C13540] hover:underline">✕ ลบ</button>
      </div>
    </div>
  )
}

function NoteForm({ editing, onClose, onDone }: { editing: Note | null; onClose: () => void; onDone: () => void }) {
  const iso = (s: string | null) => (s ? s.slice(0, 10) : '')
  const [f, setF] = useState<FormState>(editing
    ? { title: editing.title ?? '', body: editing.body, color: editing.color, pinned: editing.pinned, link: editing.link ?? '', remindAt: iso(editing.remindAt) }
    : empty)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))
  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.body.trim()) { setErr('กรอกเนื้อหาโน้ต'); return }
    setSaving(true); setErr('')
    const body = { title: f.title, body: f.body, color: f.color, pinned: f.pinned, link: f.link, remindAt: f.remindAt || null }
    try {
      const res = await fetch(editing ? `/api/notes/${editing.id}` : '/api/notes', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr(d?.message || 'บันทึกไม่สำเร็จ'); return }
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} className="mx-auto my-4 w-full max-w-lg ds-card p-5 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold text-[#1C1917]">{editing ? 'แก้ไขโน้ต' : 'เพิ่มโน้ต'}</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">หัวข้อ <span className="font-normal text-[#8492A6]">(ไม่บังคับ)</span></label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="เช่น ของต้องสั่งเพิ่ม" className={field} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">เนื้อหา <span className="text-[#C13540]">*</span></label>
          <textarea value={f.body} onChange={(e) => set('body', e.target.value)} rows={4} placeholder="รายละเอียดโน้ต…" className={field} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สี</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button type="button" key={c.key} onClick={() => set('color', c.key)} title={c.key}
                  className={`w-7 h-7 rounded-full border-2 ${f.color === c.key ? 'ring-2 ring-offset-1 ring-[#5A6B82]' : ''}`}
                  style={{ background: c.bg, borderColor: c.dot }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">วันเตือน <span className="font-normal text-[#8492A6]">(ไม่บังคับ)</span></label>
            <input type="date" value={f.remindAt} min={todayYmd()} onChange={(e) => set('remindAt', e.target.value)} className={`${field} tnum`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ลิงก์ <span className="font-normal text-[#8492A6]">(ไม่บังคับ)</span></label>
          <input value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" className={field} />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#3C4A5E]">
          <input type="checkbox" checked={f.pinned} onChange={(e) => set('pinned', e.target.checked)} className="w-4 h-4 accent-[#EA580C]" />
          📌 ปักหมุดขึ้นบนสุด
        </label>
        <div className="flex items-center gap-3 mt-1">
          <button type="submit" disabled={saving} className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
            {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มโน้ต'}
          </button>
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
          {err && <span className="text-sm text-[#C13540]">{err}</span>}
        </div>
      </form>
    </div>
  )
}
