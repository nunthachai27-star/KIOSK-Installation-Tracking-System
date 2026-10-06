'use client'
import { useState } from 'react'

const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--brand)]'

// ปุ่ม + ฟอร์ม "แจ้งปัญหา/คำแนะนำ" (ส่งได้โดยไม่ต้องล็อกอิน)
export function FeedbackButton({ source = 'fat', label = '📝 แจ้งปัญหา/คำแนะนำ' }: { source?: 'fat' | 'bp' | 'other'; label?: string }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wantCallback, setWantCallback] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  function reset() { setDetail(''); setName(''); setPhone(''); setWantCallback(false); setErr(''); setDone(false) }

  async function submit() {
    if (detail.trim().length < 3) { setErr('กรุณากรอกรายละเอียด'); return }
    if (wantCallback && !phone.trim()) { setErr('กรุณากรอกเบอร์โทรสำหรับติดต่อกลับ'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, detail, name, phone, wantCallback, website }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) { setErr(j?.message || 'ส่งไม่สำเร็จ'); return }
      setDone(true)
    } finally { setBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => { reset(); setOpen(true) }}
        className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[440px] bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="text-center py-4 flex flex-col gap-3">
                <div className="text-[34px]">✅</div>
                <div className="text-[15px] font-bold text-[#157F4C]">ส่งเรียบร้อย ขอบคุณครับ</div>
                <button onClick={() => setOpen(false)} className="text-[13px] font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white self-center">ปิด</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-bold text-[#1C1917]">📝 แจ้งปัญหา / คำแนะนำ</div>
                  <button onClick={() => setOpen(false)} className="text-[#8492A6] hover:text-[#1C1917] text-[18px]">✕</button>
                </div>
                <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} placeholder="รายละเอียดปัญหา / คำแนะนำ *" className={`${field} resize-y`} autoFocus />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ (ถ้ามี)" className={field} />
                <label className="inline-flex items-center gap-2 text-[13px] text-[#3C4A5E] cursor-pointer select-none">
                  <input type="checkbox" checked={wantCallback} onChange={(e) => setWantCallback(e.target.checked)} className="accent-[var(--brand)] w-4 h-4" />
                  ☎️ ต้องการให้ติดต่อกลับ
                </label>
                {wantCallback && (
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรติดต่อกลับ *" inputMode="tel" className={field} />
                )}
                {/* honeypot */}
                <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2">{err}</div>}
                <div className="flex gap-2 mt-1">
                  <button onClick={submit} disabled={busy} className="flex-1 text-[14px] font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
                    {busy ? 'กำลังส่ง…' : 'ส่ง'}
                  </button>
                  <button onClick={() => setOpen(false)} className="text-[14px] font-semibold px-4 py-2.5 rounded-lg border border-[#DCE4EE] text-[#5A6B82]">ยกเลิก</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
