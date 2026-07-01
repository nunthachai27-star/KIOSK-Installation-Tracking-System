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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-[#E7EDF4] rounded-2xl p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-9 h-9 rounded-lg bg-[#2F6BED] text-white grid place-items-center font-bold">K</span>
          <span className="font-bold text-lg">KIOSK</span>
        </div>
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ชื่อผู้ใช้</label>
        <input value={username} onChange={e => setU(e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 mb-4" />
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1">รหัสผ่าน</label>
        <input type="password" value={password} onChange={e => setP(e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 mb-4" />
        {err && <div className="text-[#C13540] text-sm mb-3">{err}</div>}
        <button className="w-full bg-[#2F6BED] text-white rounded-lg py-3 font-semibold">เข้าสู่ระบบ</button>
      </form>
    </div>
  )
}
