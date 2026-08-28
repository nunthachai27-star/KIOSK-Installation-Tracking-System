'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// แจ้งเตือนผู้สนใจโปรดักแบบสด: poll ทุก ~45 วิ ขณะเปิดหน้าเว็บ — มีรายใหม่ → เด้ง toast + เสียง
type Latest = { id: string; hospital: string; productName: string | null } | null

function beep() {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    const Ctor = AC.AudioContext || AC.webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const notes = [880, 1175] // ติ๊ง-ต่อง
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.16
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      o.start(t); o.stop(t + 0.24)
    })
    window.setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch { /* บางเบราว์เซอร์ต้องมี user gesture ก่อน — ข้ามไป */ }
}

export function LeadNotifier() {
  const [toast, setToast] = useState<{ hospital: string; product: string | null } | null>(null)
  const prev = useRef<number | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const r = await fetch('/api/kiosk-products/leads/unread', { cache: 'no-store' })
        if (r.ok && alive) {
          const j = await r.json() as { count: number; latest: Latest }
          if (prev.current !== null && j.count > prev.current && j.latest) {
            setToast({ hospital: j.latest.hospital, product: j.latest.productName })
            beep()
            window.setTimeout(() => setToast(null), 8000)
          }
          prev.current = j.count // ครั้งแรก = baseline (ไม่เด้ง)
        }
      } catch { /* เงียบ */ }
      if (alive) timer.current = window.setTimeout(poll, 45000)
    }
    poll()
    return () => { alive = false; if (timer.current) window.clearTimeout(timer.current) }
  }, [])

  if (!toast) return null
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[95] max-w-[320px] bg-white border border-[#E0CFF6] rounded-2xl shadow-[0_16px_44px_rgba(18,26,40,0.28)] p-4 flex items-start gap-3"
      style={{ animation: 'ln-in .25s ease' }}
      role="status" onClick={() => setToast(null)}>
      <span className="text-[22px] leading-none">🔔</span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold text-[#1C1917]">มีผู้สนใจโปรดักใหม่</div>
        <div className="text-[12.5px] text-[#3C4A5E] mt-0.5 truncate">{toast.hospital}</div>
        {toast.product && <div className="text-[11.5px] text-[#7A44C6] font-semibold mt-0.5">สนใจ: {toast.product}</div>}
        <div className="text-[11px] text-[#96A2B5] mt-1">เปิดเมนู → โปรดัก Kiosk → รายชื่อผู้สนใจ</div>
      </div>
      <style>{`@keyframes ln-in{from{transform:translateY(12px);opacity:0}}`}</style>
    </div>, document.body)
}
