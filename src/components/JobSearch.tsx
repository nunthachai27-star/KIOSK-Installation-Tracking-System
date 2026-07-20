'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

// Debounced job search — pushes ?q= (preserving other filters) so the server re-renders.
export function JobSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(initial)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      const p = new URLSearchParams(Array.from(sp.entries()))
      if (q.trim()) p.set('q', q.trim()); else p.delete('q')
      p.delete('page')
      const qs = p.toString()
      router.push(qs ? `/?${qs}` : '/')
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="relative flex-1 min-w-[200px]">
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหางาน, โรงพยาบาล, เลขที่งาน…"
        className="w-full border border-[#D6DFEA] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[13px]">🔍</span>
      {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#C13540]">✕</button>}
    </div>
  )
}
