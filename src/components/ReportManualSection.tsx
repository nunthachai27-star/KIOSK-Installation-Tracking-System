'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Entry = { id: string; heading: string; detail: string }

export function ReportManualSection({ entries, dateKey, canEdit }: { entries: Entry[]; dateKey: string; canEdit: boolean }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [heading, setHeading] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!canEdit && entries.length === 0) return null

  function openAdd() { setEditId(null); setHeading(''); setDetail(''); setErr(''); setAdding(true) }
  function openEdit(e: Entry) { setAdding(false); setEditId(e.id); setHeading(e.heading); setDetail(e.detail); setErr('') }
  function close() { setAdding(false); setEditId(null); setErr('') }

  async function save() {
    if (!heading.trim()) { setErr('กรุณากรอกหัวข้อ'); return }
    setBusy(true); setErr('')
    try {
      const url = editId ? `/api/report-entries/${editId}` : '/api/report-entries'
      const r = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateKey, heading, detail }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { close(); router.refresh() } else setErr(j.message || 'บันทึกไม่สำเร็จ')
    } finally { setBusy(false) }
  }
  async function del(id: string) {
    if (!confirm('ลบงานสรุปนี้?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/report-entries/${id}`, { method: 'DELETE' })
      if (r.ok) router.refresh()
    } finally { setBusy(false) }
  }

  const form = (
    <div className="rounded-xl border border-[#E4D9F5] bg-[#FBF9FE] p-3 flex flex-col gap-2">
      <input value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={200} placeholder="หัวข้องาน เช่น ประชุมทีม / จัดเอกสาร"
        className="w-full border border-[#E7EDF4] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#7A44C6]" />
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={4000} rows={3} placeholder="รายละเอียด (พิมพ์บรรทัดละรายการ)"
        className="w-full border border-[#E7EDF4] rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-[#7A44C6]" />
      {err && <div className="text-[12px] text-[#C13540]">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button onClick={close} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:bg-[#F4F6F9]">ยกเลิก</button>
        <button onClick={save} disabled={busy} className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg bg-[#7A44C6] text-white hover:brightness-95 disabled:opacity-50">{busy ? 'กำลังบันทึก…' : editId ? 'บันทึกการแก้ไข' : 'เพิ่ม'}</button>
      </div>
    </div>
  )

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14.5px] font-bold text-[#1C1917]">📝 งานสรุปเพิ่มเติม (พิมพ์เอง)</span>
        {entries.length > 0 && <span className="text-[11px] font-bold tnum px-2 py-0.5 rounded-full bg-[#F0E8FB] text-[#7A44C6]">{entries.length}</span>}
        {canEdit && !adding && editId === null && (
          <button onClick={openAdd} className="ml-auto text-[12px] font-semibold text-[#7A44C6] border border-[#E4D9F5] rounded-lg px-2.5 py-1 hover:bg-[#F6F0FD]">＋ เพิ่ม</button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {entries.map((e) => (
          editId === e.id ? <div key={e.id}>{form}</div> : (
            <div key={e.id} className="rounded-xl border border-[#EEEAE6] bg-[#FBFAF8] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13.5px] font-bold text-[#1C1917]">{e.heading}</div>
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(e)} className="text-[11.5px] font-semibold text-[#3C4A5E] border border-[#DCE4EE] rounded-md px-2 py-0.5 hover:border-[#7A44C6] hover:text-[#7A44C6]">แก้ไข</button>
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
          )
        ))}
        {adding && form}
      </div>
    </div>
  )
}
