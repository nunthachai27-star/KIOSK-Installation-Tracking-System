'use client'
import { useEffect, useRef, useState } from 'react'

// แมวเดินเล่นทั่วหน้าจอ — ขาสลับก้าวจริง + ตัวโยก + หางแกว่ง + หันหน้าตามทาง
// เบา: เคลื่อนที่ด้วย CSS transition ต่อช่วง, ขาเดินด้วย CSS keyframes, ไม่มีรูป/ไลบรารี
// pointer-events:none ไม่บังการกด · เคารพ prefers-reduced-motion · เปิด/ปิดจากหน้าธีมสี
export const CRITTER_KEY = 'kioskCritter' // 'off' = ปิด (ค่าเริ่มต้น = เปิด)
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 56
const SPEED = 120 // px/วินาที

function readOn(): boolean {
  try { return localStorage.getItem(CRITTER_KEY) !== 'off' } catch { return true }
}

export function RunningCritter() {
  const [on, setOn] = useState(true)
  const outer = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setOn(readOn())
    const sync = () => setOn(readOn())
    window.addEventListener(CRITTER_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(CRITTER_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  useEffect(() => {
    if (!on) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const el = outer.current, fc = face.current, sv = svg.current
    if (!el || !fc || !sv) return

    let alive = true
    let timer: number | undefined
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    let x = rand(20, window.innerWidth - SIZE - 20)
    let y = rand(90, window.innerHeight - SIZE - 20)
    el.style.transform = `translate(${x}px, ${y}px)`

    const step = () => {
      if (!alive) return
      const nx = rand(20, Math.max(20, window.innerWidth - SIZE - 20))
      const ny = rand(80, Math.max(90, window.innerHeight - SIZE - 20))
      const dist = Math.hypot(nx - x, ny - y)
      const dur = Math.max(0.8, dist / SPEED)
      fc.style.transform = nx < x ? 'scaleX(-1)' : 'scaleX(1)' // หันหน้าตามทาง
      sv.classList.add('walk')                                 // เริ่มขยับขา
      el.style.transition = `transform ${dur}s ease-in-out`
      el.style.transform = `translate(${nx}px, ${ny}px)`
      x = nx; y = ny
      timer = window.setTimeout(() => {
        if (!alive) return
        sv.classList.remove('walk') // ยืนพัก/ดม — ขาหยุด
        timer = window.setTimeout(step, rand(500, 1900))
      }, dur * 1000)
    }
    timer = window.setTimeout(step, 400)
    return () => { alive = false; if (timer) window.clearTimeout(timer) }
  }, [on])

  if (!on) return null
  return (
    <div ref={outer} className="kiosk-critter" aria-hidden="true">
      <span ref={face} className="kiosk-critter-face">
        <svg ref={svg} className="kc" viewBox="0 0 60 40" width="52" height="35">
          {/* หาง */}
          <path className="kc-tail" d="M12 17 Q3 14 3 4" fill="none" stroke="#E8933B" strokeWidth="3.5" strokeLinecap="round" />
          {/* ขาไกล (จาง) */}
          <line className="kc-leg kc-b" x1="24" y1="24" x2="24" y2="34" stroke="#D07E28" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
          <line className="kc-leg kc-a" x1="34" y1="25" x2="34" y2="34" stroke="#D07E28" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
          {/* ลำตัว + คอ + หัว */}
          <g className="kc-body">
            <ellipse cx="27" cy="18" rx="16" ry="9" fill="#E8933B" />
            <path d="M40 20 Q44 20 46 15" fill="none" stroke="#E8933B" strokeWidth="8" strokeLinecap="round" />
            {/* หู 2 ข้าง */}
            <path d="M42 8 L44 1 L48 7 Z" fill="#E8933B" />
            <path d="M49 7 L53 1 L54 9 Z" fill="#E8933B" />
            <circle cx="48" cy="13" r="7.5" fill="#E8933B" />
            {/* ตา + จมูก + หนวด */}
            <circle cx="50" cy="12" r="1.3" fill="#2a2a2a" />
            <path d="M54 14 l1 -0.6 M54 15 l1.2 0 M54 16 l1 0.6" stroke="#7a5a3a" strokeWidth="0.6" strokeLinecap="round" />
            <circle cx="53.6" cy="14.6" r="0.9" fill="#C9584B" />
          </g>
          {/* ขาใกล้ */}
          <line className="kc-leg kc-a" x1="19" y1="24" x2="19" y2="34" stroke="#E8933B" strokeWidth="3.4" strokeLinecap="round" />
          <line className="kc-leg kc-b" x1="39" y1="25" x2="39" y2="34" stroke="#E8933B" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </span>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
.kiosk-critter{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; will-change:transform; }
.kiosk-critter-face{ display:inline-block; }
.kc{ display:block; filter:drop-shadow(0 3px 3px rgba(0,0,0,.2)); overflow:visible; }
.kc .kc-leg{ transform-box:fill-box; transform-origin:50% 0; animation-play-state:paused; }
.kc .kc-body{ transform-box:fill-box; transform-origin:center; animation:kc-bob .26s ease-in-out infinite; animation-play-state:paused; }
.kc .kc-tail{ transform-box:fill-box; transform-origin:100% 100%; animation:kc-wag .5s ease-in-out infinite; animation-play-state:paused; }
.kc .kc-a{ animation:kc-legA .52s ease-in-out infinite; }
.kc .kc-b{ animation:kc-legB .52s ease-in-out infinite; }
.kc.walk .kc-leg, .kc.walk .kc-body, .kc.walk .kc-tail{ animation-play-state:running; }
@keyframes kc-legA{ 0%,100%{ transform:rotate(24deg); } 50%{ transform:rotate(-24deg); } }
@keyframes kc-legB{ 0%,100%{ transform:rotate(-24deg); } 50%{ transform:rotate(24deg); } }
@keyframes kc-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-1.6px); } }
@keyframes kc-wag{ 0%,100%{ transform:rotate(-10deg); } 50%{ transform:rotate(12deg); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter{ display:none; } }
@media print{ .kiosk-critter{ display:none; } }
`
