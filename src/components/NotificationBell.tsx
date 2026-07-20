'use client'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

// Header bell — badge counts items that need attention (claims awaiting review,
// overdue jobs, loans past their due date), with a dropdown linking to each.
// Counts come from the server layout.
export function NotificationBell({ pendingClaims, overdue, overdueLoans = 0 }: { pendingClaims: number; overdue: number; overdueLoans?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const total = pendingClaims + overdue + overdueLoans
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-label="การแจ้งเตือน"
        className="relative w-9 h-9 grid place-items-center rounded-full text-[#5A6B82] hover:bg-[#F6F9FC]">
        <span className="text-[17px]">🔔</span>
        {total > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold grid place-items-center leading-none ring-2 ring-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-[#ECEFF3] shadow-[0_12px_40px_-12px_rgba(18,45,90,0.3)] p-1.5 z-30">
          <div className="px-3 py-2 border-b border-[#F1F3F6] mb-1 text-[13px] font-bold text-[#1C1917]">การแจ้งเตือน</div>
          {total === 0 ? (
            <div className="px-3 py-5 text-[12.5px] text-[#8492A6] text-center">ไม่มีรายการที่ต้องดำเนินการ ✅</div>
          ) : (
            <>
              {pendingClaims > 0 && (
                <Link href="/issues" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FBFAF8]">
                  <span className="w-8 h-8 rounded-lg bg-[#FBEBCB] text-[#B45309] grid place-items-center shrink-0">📩</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1C1917]">เคลม/ปัญหารอตรวจสอบ</div>
                    <div className="text-[11.5px] text-[#8492A6]">รอรับแจ้ง/ตรวจสอบ</div>
                  </div>
                  <span className="text-[14px] font-bold tnum text-[#B45309] shrink-0">{pendingClaims}</span>
                </Link>
              )}
              {overdue > 0 && (
                <Link href="/" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FBFAF8]">
                  <span className="w-8 h-8 rounded-lg bg-[#FBE4E4] text-[#C13540] grid place-items-center shrink-0">⏰</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1C1917]">งานเกินกำหนดส่งมอบ</div>
                    <div className="text-[11.5px] text-[#8492A6]">ต้องเร่งติดตาม</div>
                  </div>
                  <span className="text-[14px] font-bold tnum text-[#C13540] shrink-0">{overdue}</span>
                </Link>
              )}
              {overdueLoans > 0 && (
                <Link href="/loans" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FBFAF8]">
                  <span className="w-8 h-8 rounded-lg bg-[#FBE4E4] text-[#C13540] grid place-items-center shrink-0">🤝</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1C1917]">ของยืมเกินกำหนดคืน</div>
                    <div className="text-[11.5px] text-[#8492A6]">ติดตามจากเบอร์ผู้ยืม</div>
                  </div>
                  <span className="text-[14px] font-bold tnum text-[#C13540] shrink-0">{overdueLoans}</span>
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
