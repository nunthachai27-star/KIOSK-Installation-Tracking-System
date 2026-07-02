'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn('credentials', { username, password, redirect: false })
    if (res?.error) { setErr('เข้าสู่ระบบไม่สำเร็จ ตรวจสอบชื่อผู้ใช้/รหัสผ่าน'); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* ambient brand glow */}
      <div className="pointer-events-none absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full opacity-[0.18] blur-3xl" style={{ background: 'var(--brand-gradient)' }} />
      <div className="pointer-events-none absolute -bottom-40 -left-32 w-[440px] h-[440px] rounded-full opacity-[0.12] blur-3xl bg-[#6D5DF6]" />

      <form onSubmit={submit} className="ds-card relative w-full max-w-sm p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <span className="ds-logo w-12 h-12 rounded-[14px] text-white grid place-items-center font-bold text-xl mb-3">K</span>
          <span className="font-bold text-lg tracking-tight">KIOSK Tracking</span>
          <span className="text-[13px] text-[#8492A6] mt-0.5">ระบบบันทึกและติดตามงานติดตั้ง</span>
        </div>
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ชื่อผู้ใช้</label>
        <input
          value={username}
          onChange={e => setU(e.target.value)}
          autoComplete="username"
          className="w-full border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 mb-4 outline-none focus:border-[#2F6BED] focus:ring-2 focus:ring-[#2F6BED]/15 transition"
        />
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={e => setP(e.target.value)}
          autoComplete="current-password"
          className="w-full border border-[#D6DFEA] rounded-xl px-3.5 py-2.5 mb-4 outline-none focus:border-[#2F6BED] focus:ring-2 focus:ring-[#2F6BED]/15 transition"
        />
        {err && <div className="text-[#C13540] text-sm mb-3">{err}</div>}
        <button className="ds-hover w-full bg-[#2F6BED] text-white rounded-xl py-3 font-semibold hover:bg-[#1E51D0] shadow-[0_10px_24px_-10px_rgba(47,107,237,0.6)]">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  )
}
