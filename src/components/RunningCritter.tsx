'use client'
import { useEffect, useRef, useState } from 'react'

// แมวเดินเล่นทั่วหน้าจอ พร้อมพฤติกรรมขี้เล่น: เดิน · นั่งเลียขน · ไล่เล่นลูกบอล · ตอบสนองเมาส์
// เบา: เคลื่อนที่ด้วย CSS transition ต่อช่วง + ตัวจับเวลาไม่กี่ตัว, ไม่มีรูป/ไลบรารี, ไม่วาดทุกเฟรม
// pointer-events:none ไม่บังการกด · เคารพ prefers-reduced-motion · เปิด/ปิดจากหน้าธีมสี
export const CRITTER_KEY = 'kioskCritter'
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 56
const SPEED = 120 // px/วินาที

function readOn(): boolean {
  try { return localStorage.getItem(CRITTER_KEY) !== 'off' } catch { return true }
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function RunningCritter() {
  const [on, setOn] = useState(true)
  const outer = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const head = useRef<SVGGElement>(null)
  const ball = useRef<HTMLDivElement>(null)

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
    const el = outer.current, fc = face.current, sv = svg.current, hd = head.current, bl = ball.current
    if (!el || !fc || !sv || !hd || !bl) return

    let alive = true
    let gen = 0
    let mode: 'roam' | 'rest' | 'ball' | 'chase' = 'roam'
    let timers: number[] = []
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const vw = () => window.innerWidth, vh = () => window.innerHeight
    let x = rand(40, vw() - SIZE - 40), y = rand(120, vh() - SIZE - 40)
    el.style.transform = `translate(${x}px, ${y}px)`
    let mx = -999, my = -999, mouseAt = 0, lastReact = 0

    const after = (ms: number, fn: () => void) => {
      const g = gen
      const t = window.setTimeout(() => { if (alive && g === gen) fn() }, ms)
      timers.push(t)
    }
    const clearAll = () => { timers.forEach(clearTimeout); timers = [] }

    // ย้ายไปยังพิกัด แล้วคืนระยะเวลา(ms) — ใส่คลาสเดินให้ขาขยับ
    const moveTo = (tx: number, ty: number, speed: number) => {
      tx = clamp(tx, 10, vw() - SIZE - 10); ty = clamp(ty, 70, vh() - SIZE - 10)
      const dist = Math.hypot(tx - x, ty - y)
      const dur = Math.max(0.35, dist / speed)
      fc.style.transform = tx < x ? 'scaleX(-1)' : 'scaleX(1)'
      hd.style.transform = ''
      sv.className.baseVal = 'kc walk'
      el.style.transition = `transform ${dur}s ease-in-out`
      el.style.transform = `translate(${tx}px, ${ty}px)`
      x = tx; y = ty
      return dur * 1000
    }
    const stand = () => { sv.className.baseVal = 'kc' }

    const setBall = (bx: number, by: number, dur: number) => {
      bl.style.transition = `transform ${dur}s ease-out, opacity .25s`
      bl.style.transform = `translate(${bx}px, ${by}px)`
      bl.style.opacity = '1'
    }
    const hideBall = () => { bl.style.opacity = '0' }

    // ── พฤติกรรม ────────────────────────────────────────────────────────────
    const roam = () => {
      mode = 'roam'
      const ms = moveTo(rand(10, vw() - SIZE - 10), rand(70, vh() - SIZE - 10), SPEED)
      after(ms, () => { stand(); after(rand(500, 1500), next) })
    }
    const rest = () => {
      mode = 'rest'
      const groom = Math.random() < 0.55
      sv.className.baseVal = groom ? 'kc groom' : 'kc'
      after(rand(1900, 4200), () => { hd.style.transform = ''; stand(); next() })
    }
    const play = () => {
      mode = 'ball'
      let bx = clamp(x + rand(-140, 140), 20, vw() - 46)
      let by = clamp(y + rand(-90, 90), 70, vh() - 46)
      setBall(bx, by, 0.3)
      let hits = 2 + Math.floor(Math.random() * 3)
      const chaseOnce = () => {
        if (!alive) return
        const ms = moveTo(bx - 16, by - 6, SPEED * 1.5)
        after(ms, () => {
          bx = clamp(bx + rand(-170, 170), 20, vw() - 46)
          by = clamp(by + rand(-130, 130), 70, vh() - 46)
          setBall(bx, by, 0.5) // ตะปบให้กลิ้งไป
          stand()
          hits--
          if (hits > 0) after(rand(350, 750), chaseOnce)
          else after(500, () => { hideBall(); next() })
        })
      }
      after(300, chaseOnce)
    }
    const chase = () => {
      mode = 'chase'
      const ms = moveTo(mx - 28, my - 18, SPEED * 2.6) // พุ่งเข้าหาเมาส์เร็วๆ
      after(ms, () => { stand(); after(rand(500, 1300), next) })
    }

    const next = () => {
      if (!alive) return
      gen++
      const cx = x + 28, cy = y + 20
      const mouseNear = Date.now() - mouseAt < 4000 && Math.hypot(mx - cx, my - cy) < 420
      const r = Math.random()
      if (mouseNear && r < 0.55) return chase()
      if (r < 0.42) return roam()
      if (r < 0.72) return rest()
      return play()
    }

    // เมาส์: มองตามเคอร์เซอร์ตอนนั่ง + พุ่งเข้าหาถ้าเข้าใกล้
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY; mouseAt = Date.now()
      const cx = x + 28, cy = y + 20
      if (mode === 'rest' && !sv.className.baseVal.includes('groom')) {
        hd.style.transform = `rotate(${clamp((my - cy) / 22, -14, 14)}deg)`
        fc.style.transform = mx < cx ? 'scaleX(-1)' : 'scaleX(1)'
      }
      const d = Math.hypot(mx - cx, my - cy)
      if (d < 150 && Date.now() - lastReact > 2600 && (mode === 'roam' || mode === 'rest')) {
        lastReact = Date.now(); gen++; clearAll(); hd.style.transform = ''; chase()
      }
    }
    window.addEventListener('mousemove', onMove)

    after(500, next)
    return () => { alive = false; clearAll(); window.removeEventListener('mousemove', onMove) }
  }, [on])

  if (!on) return null
  return (
    <>
      <div ref={ball} className="kc-ball" aria-hidden="true">🧶</div>
      <div ref={outer} className="kiosk-critter" aria-hidden="true">
        <span ref={face} className="kiosk-critter-face">
          <svg ref={svg} className="kc" viewBox="0 0 60 40" width="52" height="35">
            <path className="kc-tail" d="M12 17 Q3 14 3 4" fill="none" stroke="#E8933B" strokeWidth="3.5" strokeLinecap="round" />
            <line className="kc-leg kc-b" x1="24" y1="24" x2="24" y2="34" stroke="#D07E28" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
            <line className="kc-leg kc-a" x1="34" y1="25" x2="34" y2="34" stroke="#D07E28" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
            <g className="kc-body">
              <ellipse cx="27" cy="18" rx="16" ry="9" fill="#E8933B" />
              <path d="M40 20 Q44 20 46 15" fill="none" stroke="#E8933B" strokeWidth="8" strokeLinecap="round" />
              <g ref={head} className="kc-head">
                <path d="M42 8 L44 1 L48 7 Z" fill="#E8933B" />
                <path d="M49 7 L53 1 L54 9 Z" fill="#E8933B" />
                <circle cx="48" cy="13" r="7.5" fill="#E8933B" />
                <circle cx="50" cy="12" r="1.4" fill="#2a2a2a" />
                <path d="M54 14 l1.4 -0.6 M54 15 l1.5 0 M54 16 l1.4 0.6" stroke="#7a5a3a" strokeWidth="0.6" strokeLinecap="round" />
                <circle cx="53.6" cy="14.6" r="0.95" fill="#C9584B" />
              </g>
            </g>
            <line className="kc-leg kc-a" x1="19" y1="24" x2="19" y2="34" stroke="#E8933B" strokeWidth="3.4" strokeLinecap="round" />
            <line className="kc-leg kc-b" x1="39" y1="25" x2="39" y2="34" stroke="#E8933B" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
        </span>
        <style>{CSS}</style>
      </div>
    </>
  )
}

const CSS = `
.kiosk-critter{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; will-change:transform; }
.kiosk-critter-face{ display:inline-block; }
.kc-ball{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; font-size:20px; line-height:1; opacity:0; will-change:transform; filter:drop-shadow(0 2px 2px rgba(0,0,0,.2)); }
.kc{ display:block; filter:drop-shadow(0 3px 3px rgba(0,0,0,.2)); overflow:visible; }
.kc .kc-leg{ transform-box:fill-box; transform-origin:50% 0; animation-play-state:paused; }
.kc .kc-body{ transform-box:fill-box; transform-origin:center; animation:kc-bob .26s ease-in-out infinite; animation-play-state:paused; }
.kc .kc-tail{ transform-box:fill-box; transform-origin:100% 100%; animation:kc-wag .5s ease-in-out infinite; animation-play-state:paused; }
.kc .kc-head{ transform-box:fill-box; transform-origin:14% 92%; }
.kc .kc-a{ animation:kc-legA .52s ease-in-out infinite; }
.kc .kc-b{ animation:kc-legB .52s ease-in-out infinite; }
.kc.walk .kc-leg, .kc.walk .kc-body, .kc.walk .kc-tail{ animation-play-state:running; }
.kc.groom .kc-head{ animation:kc-lick 1.1s ease-in-out infinite; }
.kc.groom .kc-tail{ animation:kc-curl 3s ease-in-out infinite; animation-play-state:running; }
@keyframes kc-legA{ 0%,100%{ transform:rotate(24deg); } 50%{ transform:rotate(-24deg); } }
@keyframes kc-legB{ 0%,100%{ transform:rotate(-24deg); } 50%{ transform:rotate(24deg); } }
@keyframes kc-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-1.6px); } }
@keyframes kc-wag{ 0%,100%{ transform:rotate(-10deg); } 50%{ transform:rotate(12deg); } }
@keyframes kc-lick{ 0%,55%,100%{ transform:rotate(0); } 25%{ transform:rotate(30deg); } 40%{ transform:rotate(24deg); } }
@keyframes kc-curl{ 0%,100%{ transform:rotate(-4deg); } 50%{ transform:rotate(6deg); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter, .kc-ball{ display:none; } }
@media print{ .kiosk-critter, .kc-ball{ display:none; } }
`
