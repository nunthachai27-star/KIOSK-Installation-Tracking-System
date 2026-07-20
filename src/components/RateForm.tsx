'use client'
import { useState } from 'react'

export function RateForm({ id, initialRating, initialComment }: { id: string; initialRating: number | null; initialComment: string | null }) {
  const [rating, setRating] = useState(initialRating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(initialComment ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!(rating >= 1 && rating <= 5)) { setErr('กรุณาเลือกคะแนน 1-5 ดาว'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/rate/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, comment }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr(d?.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); return }
      setDone(true)
    } catch { setErr('เกิดข้อผิดพลาด กรุณาลองใหม่') } finally { setSaving(false) }
  }

  const labels = ['', 'ควรปรับปรุงมาก', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก']

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">🙏</div>
        <div className="text-lg font-bold text-[#1C1917]">ขอบคุณสำหรับคะแนน!</div>
        <div className="text-[15px] text-[#5A6B82] mt-1">คุณให้คะแนน {rating}/5 ดาว</div>
        <div className="text-[13px] text-[#8492A6] mt-3">ทีมงาน BMS จะนำไปพัฒนาการบริการต่อไป</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
            className="text-4xl leading-none transition-transform hover:scale-110" aria-label={`${n} ดาว`}>
            <span style={{ color: (hover || rating) >= n ? '#F59E0B' : '#D6DCE4' }}>★</span>
          </button>
        ))}
      </div>
      <div className="h-5 text-[15px] font-semibold text-[#D97706]">{labels[hover || rating]}</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="ความคิดเห็นเพิ่มเติม (ถ้ามี)…"
        className="w-full border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
      {err && <div className="text-sm text-[#C13540] font-medium">{err}</div>}
      <button onClick={submit} disabled={saving || rating === 0}
        className="w-full bg-[#EA580C] text-white font-bold rounded-xl px-5 py-3 hover:bg-[#C2410C] disabled:opacity-50 text-[15px]">
        {saving ? 'กำลังส่ง…' : 'ส่งคะแนนประเมิน'}
      </button>
    </div>
  )
}
