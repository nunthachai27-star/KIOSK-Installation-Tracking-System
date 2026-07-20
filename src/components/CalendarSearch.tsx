'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

// Debounced hospital search for the calendar — pushes ?q= (preserving month/kind/view).
export function CalendarSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(initial)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      const p = new URLSearchParams(Array.from(sp.entries()))
      if (q.trim()) p.set('q', q.trim()); else p.delete('q')
      const qs = p.toString()
      router.push(qs ? `/calendar?${qs}` : '/calendar')
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงพยาบาล…"
        className="w-44 border border-[#D6DFEA] rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
    </div>
  )
}
