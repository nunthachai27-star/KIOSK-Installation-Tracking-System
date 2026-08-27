'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

// เมนูบัญชีสำหรับมือถือ — แตะ "ฉัน" แล้วเด้ง sheet ขึ้นมา มีปุ่มออกจากระบบชัดเจน
export function MobileAccountMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[#8492A6] active:scale-95 transition-transform"
        aria-label="บัญชีของฉัน"
      >
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white grid place-items-center text-[11px] font-bold">{initial}</span>
        <span className="text-[11px] font-semibold">ฉัน</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(15,22,33,0.45)] backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-8 shadow-[0_-8px_40px_rgba(18,26,40,0.25)]"
            style={{ animation: 'macm-up .22s ease' }}>
            <div className="w-10 h-1.5 rounded-full bg-[#E2E7EE] mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-full bg-[var(--brand)] text-white grid place-items-center text-lg font-bold">{initial}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-[#1C1917] truncate">{name || 'ผู้ใช้งาน'}</div>
                <div className="text-[12.5px] text-[#8492A6]">{role}</div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => { setBusy(true); signOut({ callbackUrl: '/login' }) }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#FBE9E9] text-[#C13540] font-bold text-[15px] py-3.5 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 6V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" /><path d="M9 10h8M14 7l3 3-3 3" />
              </svg>
              {busy ? 'กำลังออก…' : 'ออกจากระบบ'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="w-full mt-2.5 rounded-2xl text-[#5A6B82] font-semibold text-[14px] py-3 active:scale-[0.98] transition-transform">
              ยกเลิก
            </button>
          </div>
          <style>{`@keyframes macm-up{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(prefers-reduced-motion:reduce){[style*="macm-up"]{animation:none!important}}`}</style>
        </div>
      )}
    </>
  )
}
