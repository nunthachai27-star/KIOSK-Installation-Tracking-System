'use client'
import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'

// Avatar + name + role in the header, opening a dropdown with sign-out.
export function UserMenu({ name, initial, role }: { name: string; initial: string; role: string }) {
  const [open, setOpen] = useState(false)
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
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#C13540] hover:bg-[#FBE4E4] flex items-center gap-2">
            ⎋ ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}
