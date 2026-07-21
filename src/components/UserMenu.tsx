'use client'
import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'

// Avatar + name + role in the header, opening a dropdown with change-password + sign-out.
export function UserMenu({ name, initial, role }: { name: string; initial: string; role: string }) {
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[#F6F9FC]">
        <span className="w-8 h-8 rounded-full bg-[#FFEDE1] text-[#EA580C] grid place-items-center font-bold text-sm ring-1 ring-[#FBD3B4]">{initial}</span>
        <span className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold text-[#1C1917] max-w-[140px] truncate">{name}</span>
          <span className="text-[11px] text-[#8492A6]">{role}</span>
        </span>
        <span className={`text-[#A8A29E] text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#ECEFF3] shadow-[0_12px_40px_-12px_rgba(18,45,90,0.3)] p-1.5 z-30">
          <div className="px-3 py-2 border-b border-[#F1F3F6] mb-1">
            <div className="text-[13px] font-semibold text-[#1C1917] truncate">{name}</div>
            <div className="text-[11.5px] text-[#8492A6]">{role}</div>
          </div>
          <button onClick={() => { setOpen(false); setPwOpen(true) }}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🔑 เปลี่ยนรหัสผ่าน
          </button>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#C13540] hover:bg-[#FBE4E4] flex items-center gap-2">
            ⎋ ออกจากระบบ
          </button>
        </div>
      )}

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const ready = current && next.length >= 4 && next === confirm && next !== current

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErr(d?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
        return
      }
      setDone(true)
    } finally { setSaving(false) }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-[#1C1917]">🔑 เปลี่ยนรหัสผ่าน</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[#157F4C] bg-[#F2FAF5] border border-[#DCF0E4] rounded-lg px-3 py-3">
              ✓ เปลี่ยนรหัสผ่านเรียบร้อย — ครั้งต่อไปให้ใช้รหัสใหม่ล็อกอิน
            </div>
            <button onClick={onClose} className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C]">ปิด</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสผ่านปัจจุบัน</label>
              <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสผ่านใหม่ <span className="font-normal text-[#8492A6]">(อย่างน้อย 4 ตัว)</span></label>
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              {confirm && next !== confirm && <div className="text-[11.5px] text-[#C13540] mt-1">รหัสผ่านใหม่ไม่ตรงกัน</div>}
              {next && next === current && <div className="text-[11.5px] text-[#C13540] mt-1">รหัสผ่านใหม่ต้องต่างจากเดิม</div>}
            </div>
            {err && <div className="text-sm text-[#C13540]">{err}</div>}
            <div className="flex items-center gap-2 mt-1">
              <button type="submit" disabled={!ready || saving}
                className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
              </button>
              <button type="button" onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
