'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

type Entry = { id: string; heading: string; detail: string }

export function ReportManualSection({ entries, dateKey, canEdit }: { entries: Entry[]; dateKey: string; canEdit: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Entry | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  if (!canEdit && entries.length === 0) return null

  async function del(id: string) {
    if (!confirm('ลบงานสรุปนี้?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/report-entries/${id}`, { method: 'DELETE' })
      if (r.ok) router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14.5px] font-bold text-[#1C1917]">📝 งานสรุปเพิ่มเติม (พิมพ์เอง)</span>
        {entries.length > 0 && <span className="text-[11px] font-bold tnum px-2 py-0.5 rounded-full bg-[#F0E8FB] text-[#7A44C6]">{entries.length}</span>}
        {canEdit && (
          <button onClick={() => setEditing('new')} className="ml-auto text-[12px] font-semibold text-[#7A44C6] border border-[#E4D9F5] rounded-lg px-2.5 py-1 hover:bg-[#F6F0FD]">＋ เพิ่ม</button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {entries.map((e) => (
          <div key={e.id} className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13.5px] font-bold text-[#1C1917]">{e.heading}</div>
              {canEdit && (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setEditing(e)} className="text-[11.5px] font-semibold text-[#3C4A5E] border border-[#DCE4EE] rounded-md px-2 py-0.5 hover:border-[#7A44C6] hover:text-[#7A44C6]">แก้ไข</button>
                  <button onClick={() => del(e.id)} disabled={busy} className="text-[11.5px] font-semibold text-[#C13540] border border-[#E7B4B4] rounded-md px-2 py-0.5 hover:bg-[#FBE9E9]">ลบ</button>
                </div>
              )}
            </div>
            {e.detail.trim() && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {e.detail.split('\n').filter(Boolean).map((ln, k) => (
                  <li key={k} className="flex items-start gap-1.5 text-[12.5px] text-[#5A6B82]"><span className="text-[#C4BFB9] mt-0.5">•</span><span className="whitespace-pre-wrap">{ln}</span></li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <EntryModal entry={editing === 'new' ? null : editing} dateKey={dateKey}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh() }} />
      )}
    </div>
  )
}

function EntryModal({ entry, dateKey, onClose, onSaved }: { entry: Entry | null; dateKey: string; onClose: () => void; onSaved: () => void }) {
  const isNew = !entry
  const [heading, setHeading] = useState(entry?.heading ?? '')
  const [detail, setDetail] = useState(entry?.detail ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    if (!heading.trim()) { setErr('กรุณากรอกหัวข้อ'); return }
    setBusy(true); setErr('')
    try {
      const url = isNew ? '/api/report-entries' : `/api/report-entries/${entry!.id}`
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateKey, heading, detail }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) onSaved(); else setErr(j.message || 'บันทึกไม่สำเร็จ')
    } finally { setBusy(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[rgba(15,22,33,0.5)] backdrop-blur-[3px] p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-[0_16px_48px_rgba(18,26,40,0.28)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F3]">
          <div className="text-[15.5px] font-bold text-[#1C1917]">📝 {isNew ? 'เพิ่มงานสรุป (พิมพ์เอง)' : 'แก้ไขงานสรุป'}</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg bg-[#F4F6F9] text-[#8492A6] hover:bg-[#E7EBF0]">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-bold text-[#96A2B5] uppercase tracking-wide mb-1.5">หัวข้องาน</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={200} autoFocus
              placeholder="เช่น ประชุมทีม / จัดเอกสาร / งานรีโมทติดตั้ง"
              className="w-full border border-[#D6DFEA] rounded-xl px-3.5 py-3 text-[14px] outline-none focus:border-[#7A44C6] focus:ring-2 focus:ring-[#7A44C6]/15" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#96A2B5] uppercase tracking-wide mb-1.5">รายละเอียด <span className="normal-case font-medium text-[#B6C0CE]">(พิมพ์บรรทัดละรายการ)</span></label>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={4000} rows={8}
              placeholder={'เช่น\nโรงพยาบาล… จำนวน … เครื่อง\nติดต่อเจ้าหน้าที่ IT รีโมทเข้า HOSxP XE'}
              className="w-full border border-[#D6DFEA] rounded-xl px-3.5 py-3 text-[14px] leading-relaxed resize-y outline-none focus:border-[#7A44C6] focus:ring-2 focus:ring-[#7A44C6]/15" />
          </div>
          {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#EEF0F3] bg-[#FBFAFC]">
          <button onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-4 py-2.5 rounded-lg hover:bg-[#F0EEEC]">ยกเลิก</button>
          <button onClick={save} disabled={busy}
            className="text-[13.5px] font-semibold px-5 py-2.5 rounded-lg bg-[#7A44C6] text-white hover:brightness-95 disabled:opacity-50">
            {busy ? 'กำลังบันทึก…' : isNew ? 'เพิ่มงานสรุป' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>, document.body)
}
