'use client'
import { useEffect, useRef, useState } from 'react'

// สัตว์เดินเล่นทั่วหน้าจอ (สุ่มจุดหมายไปเรื่อยๆ) — เบา: ขยับด้วย CSS transition ต่อช่วง
// ไม่ใช่วาดทุกเฟรม, ไม่มีรูป/ไลบรารี. หันหน้าตามทาง + เร่ง-ชะลอ + หยุดพัก + สลับตัว.
// pointer-events:none ไม่บังการกด · เคารพ prefers-reduced-motion · เปิด/ปิดจากหน้าธีมสี
const ANIMALS = ['🐈', '🐕', '🦆', '🐢', '🐇', '🐿️', '🦔', '🐤', '🦫', '🐥']
export const CRITTER_KEY = 'kioskCritter' // 'off' = ปิด (ค่าเริ่มต้น = เปิด)
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 40
const SPEED = 130 // px/วินาที

function readOn(): boolean {
  try { return localStorage.getItem(CRITTER_KEY) !== 'off' } catch { return true }
}

export function RunningCritter() {
  const [on, setOn] = useState(true)
  const [emoji, setEmoji] = useState('🐈')
  const outer = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const inner = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setOn(readOn())
    setEmoji(ANIMALS[Math.floor(Math.random() * ANIMALS.length)])
    const sync = () => setOn(readOn())
    window.addEventListener(CRITTER_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(CRITTER_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  useEffect(() => {
    if (!on) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const el = outer.current, fc = face.current, inn = inner.current
    if (!el || !fc || !inn) return

    let alive = true
    let timer: number | undefined
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    let x = rand(20, window.innerWidth - SIZE - 20)
    let y = rand(90, window.innerHeight - SIZE - 20)
    el.style.transform = `translate(${x}px, ${y}px)`

    const step = () => {
      if (!alive) return
      const maxX = Math.max(20, window.innerWidth - SIZE - 20)
      const maxY = Math.max(90, window.innerHeight - SIZE - 20)
      const nx = rand(20, maxX)
      const ny = rand(80, maxY) // ต่ำกว่าแถบเมนูด้านบน
      const dist = Math.hypot(nx - x, ny - y)
      const dur = Math.max(0.7, dist / SPEED)
      fc.style.transform = nx < x ? 'scaleX(-1)' : 'scaleX(1)' // หันหน้าตามทาง
      inn.style.animationDuration = `${Math.max(0.22, 0.36 - dist / 6000)}s` // ยิ่งไกล ยิ่งขยับถี่
      inn.style.animationPlayState = 'running' // กำลังเดิน
      el.style.transition = `transform ${dur}s ease-in-out`
      el.style.transform = `translate(${nx}px, ${ny}px)`
      x = nx; y = ny
      timer = window.setTimeout(() => {
        if (!alive) return
        inn.style.animationPlayState = 'paused' // หยุดพัก/ดม
        if (Math.random() < 0.4) setEmoji(ANIMALS[Math.floor(Math.random() * ANIMALS.length)])
        timer = window.setTimeout(step, rand(350, 1600))
      }, dur * 1000)
    }
    timer = window.setTimeout(step, 400)
    return () => { alive = false; if (timer) window.clearTimeout(timer) }
  }, [on])

  if (!on) return null
  return (
    <div ref={outer} className="kiosk-critter" aria-hidden="true">
      <span ref={face} className="kiosk-critter-face">
        <span ref={inner} className="kiosk-critter-in">{emoji}</span>
      </span>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
.kiosk-critter{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; will-change:transform; }
.kiosk-critter-face{ display:inline-block; }
.kiosk-critter-in{ display:inline-block; font-size:30px; line-height:1; filter:drop-shadow(0 3px 3px rgba(0,0,0,.18)); animation:kc-run .32s ease-in-out infinite; transform-origin:bottom center; }
@keyframes kc-run{ 0%,100%{ transform:translateY(0) rotate(-4deg); } 50%{ transform:translateY(-5px) rotate(4deg); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter{ display:none; } }
@media print{ .kiosk-critter{ display:none; } }
`
