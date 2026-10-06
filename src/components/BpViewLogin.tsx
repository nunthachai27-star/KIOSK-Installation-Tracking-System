'use client'
import { useState } from 'react'

export function BpViewLogout() {
  return (
    <button type="button" onClick={() => fetch('/api/bp-view/login', { method: 'DELETE' }).then(() => location.reload())}
      className="text-[12.5px] text-[#8492A6] hover:text-[#C13540]">ออกจากระบบ</button>
  )
}

export function BpViewLogin() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/bp-view/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass }),
      })
      if (r.ok) { window.location.reload(); return }
      const j = await r.json().catch(() => null)
      setErr(j?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } catch {
      setErr('เชื่อมต่อไม่สำเร็จ')
    } finally { setBusy(false) }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--brand)]'
  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-[360px] bg-white border border-[#E7EDF4] rounded-2xl p-6 shadow-[0_14px_40px_-18px_rgba(18,45,90,0.35)] flex flex-col gap-3">
        <div className="text-center mb-1">
          <div className="text-[30px]">🩺</div>
          <div className="text-[16px] font-bold text-[#1C1917]">รายงานทดสอบเครื่องวัดความดัน</div>
          <div className="text-[12.5px] text-[#8492A6] mt-0.5">สำหรับดูอย่างเดียว · เข้าสู่ระบบก่อน</div>
        </div>
        <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="ชื่อผู้ใช้" autoComplete="username" className={field} />
        <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="รหัสผ่าน" autoComplete="current-password" className={field} />
        {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2">{err}</div>}
        <button type="submit" disabled={busy || !user || !pass}
          className="w-full text-[14px] font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
