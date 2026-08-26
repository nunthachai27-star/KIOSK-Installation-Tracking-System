'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

// โลโก้ K = ปุ่มรีเฟรชข้อมูลหน้าปัจจุบัน (soft refresh ไม่โหลดทั้งหน้า) + เอฟเฟกต์หมุน.
// (เมนู "แดชบอร์ด" ย้ายไปเป็นแถบในนาวิเกชันแล้ว)
export function BrandRefresh() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)
  const [pending, startTransition] = useTransition()

  function refresh() {
    setSpinning(true)
    startTransition(() => router.refresh())
    window.setTimeout(() => setSpinning(false), 700)
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={refresh}
        title="รีเฟรชข้อมูล"
        aria-label="รีเฟรชข้อมูล"
        aria-busy={pending}
        className={`ds-logo w-8 h-8 rounded-[10px] text-white grid place-items-center font-bold text-sm transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 ${spinning ? 'dvb-spin' : ''}`}
      >
        K
      </button>
      <span className="font-bold text-base tracking-tight select-none">KIOSK</span>
      <style>{`@keyframes dvbspin{to{transform:rotate(360deg)}}.dvb-spin{animation:dvbspin .7s ease-in-out}@media(prefers-reduced-motion:reduce){.dvb-spin{animation:none}}`}</style>
    </div>
  )
}
