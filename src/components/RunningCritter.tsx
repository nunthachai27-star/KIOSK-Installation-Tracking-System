'use client'
import { useEffect, useRef, useState } from 'react'

// แมว SVG เดินเล่นทั่วหน้าจอ พร้อมพฤติกรรม: เดิน · นั่งเลียขน · เล่นลูกบอล · ตอบสนองเมาส์ · นอนหลับ
// เบา: เคลื่อนที่ด้วย CSS transition ต่อช่วง + ตัวจับเวลาไม่กี่ตัว, ขา/หาง/ตา ขยับด้วย CSS keyframes
// (ไม่วาดทุกเฟรม, ไม่มีรูป/ไลบรารี) · pointer-events:none ไม่บังการกด · เปิด/ปิดจากหน้าธีมสี
export const CRITTER_KEY = 'kioskCritter'
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 60
const SPEED = 118 // px/วินาที

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
    let mode = 'roam'
    let timers: number[] = []
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const vw = () => window.innerWidth, vh = () => window.innerHeight
    let x = rand(40, vw() - SIZE - 40), y = rand(120, vh() - SIZE - 40)
    el.style.transform = `translate(${x}px, ${y}px)`
    let mx = -999, my = -999, mouseAt = Date.now(), lastReact = 0

    const after = (ms: number, fn: () => void) => {
      const g = gen
      const t = window.setTimeout(() => { if (alive && g === gen) fn() }, ms)
      timers.push(t)
    }
    const clearAll = () => { timers.forEach(clearTimeout); timers = [] }
    const pose = (p: string, extra = '') => { sv.className.baseVal = `kc ${p}${extra ? ' ' + extra : ''}` }

    const moveTo = (tx: number, ty: number, speed: number) => {
      tx = clamp(tx, 10, vw() - SIZE - 10); ty = clamp(ty, 66, vh() - SIZE - 10)
      const dist = Math.hypot(tx - x, ty - y)
      const dur = Math.max(0.35, dist / speed)
      fc.style.transform = tx < x ? 'scaleX(-1)' : 'scaleX(1)'
      hd.style.transform = ''
      pose('p-walk', 'moving')
      el.style.transition = `transform ${dur}s ease-in-out`
      el.style.transform = `translate(${tx}px, ${ty}px)`
      x = tx; y = ty
      return dur * 1000
    }

    const setBall = (bx: number, by: number, dur: number) => {
      bl.style.transition = `transform ${dur}s ease-out, opacity .25s`
      bl.style.transform = `translate(${bx}px, ${by}px)`; bl.style.opacity = '1'
    }
    const hideBall = () => { bl.style.opacity = '0' }

    // ── พฤติกรรม ────────────────────────────────────────────────────────────
    const roam = () => {
      mode = 'roam'
      const ms = moveTo(rand(10, vw() - SIZE - 10), rand(66, vh() - SIZE - 10), SPEED)
      after(ms, () => { pose('p-walk'); after(rand(500, 1500), next) })
    }
    const rest = () => {
      mode = 'rest'
      pose('p-walk', Math.random() < 0.6 ? 'groom' : '')
      after(rand(2000, 4200), () => { hd.style.transform = ''; pose('p-walk'); next() })
    }
    const play = () => {
      mode = 'ball'
      let bx = clamp(x + rand(-140, 140), 20, vw() - 46)
      let by = clamp(y + rand(-90, 90), 66, vh() - 46)
      setBall(bx, by, 0.3)
      let hits = 2 + Math.floor(Math.random() * 3)
      const chaseOnce = () => {
        if (!alive) return
        const ms = moveTo(bx - 14, by - 4, SPEED * 1.5)
        after(ms, () => {
          bx = clamp(bx + rand(-170, 170), 20, vw() - 46)
          by = clamp(by + rand(-130, 130), 66, vh() - 46)
          setBall(bx, by, 0.5); pose('p-walk')
          if (--hits > 0) after(rand(350, 750), chaseOnce)
          else after(500, () => { hideBall(); next() })
        })
      }
      after(300, chaseOnce)
    }
    const chase = () => {
      mode = 'chase'
      const ms = moveTo(mx - 30, my - 20, SPEED * 2.6)
      after(ms, () => { pose('p-walk'); after(rand(500, 1300), next) })
    }
    const sleep = () => {
      mode = 'sleep'
      hd.style.transform = ''
      pose('p-sleep')
      // ตื่นเมื่อครบเวลา (ถ้าเมาส์ขยับใกล้จะตื่นก่อนใน onMove)
      after(rand(9000, 20000), () => { pose('p-walk'); after(700, next) })
    }

    const next = () => {
      if (!alive) return
      gen++
      const cx = x + 30, cy = y + 22
      const idle = Date.now() - mouseAt
      const mouseNear = idle < 4000 && Math.hypot(mx - cx, my - cy) < 420
      if (idle > 14000 && Math.random() < 0.6) return sleep() // เงียบนานๆ → นอน
      const r = Math.random()
      if (mouseNear && r < 0.55) return chase()
      if (r < 0.4) return roam()
      if (r < 0.72) return rest()
      return play()
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY; mouseAt = Date.now()
      const cx = x + 30, cy = y + 22
      const d = Math.hypot(mx - cx, my - cy)
      if (mode === 'sleep' && d < 220) { // ขยับเมาส์ใกล้ → ตื่น
        gen++; clearAll(); pose('p-walk'); after(300, next); return
      }
      if (mode === 'rest' && !sv.className.baseVal.includes('groom')) {
        hd.style.transform = `rotate(${clamp((my - cy) / 22, -14, 14)}deg)`
        fc.style.transform = mx < cx ? 'scaleX(-1)' : 'scaleX(1)'
      }
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
          <svg ref={svg} className="kc p-walk" viewBox="0 0 72 48" width="60" height="40">
            <defs>
              <linearGradient id="kcfur" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F2A64A" /><stop offset="1" stopColor="#DC831C" />
              </linearGradient>
            </defs>

            {/* ─── ท่ายืน/เดิน ─── */}
            <g className="g-walk">
              {/* หาง (ฟู โค้ง) */}
              <path className="kc-tail" d="M13 22 C4 20 0 12 4 5 C6 10 9 15 16 18 C15 20 14 21 13 22 Z" fill="url(#kcfur)" />
              {/* ขาไกล */}
              <g className="kc-leg kc-b kc-far"><rect x="25" y="29" width="3.6" height="11" rx="1.8" fill="#CF7B1C" /><ellipse cx="26.8" cy="40.3" rx="2.7" ry="1.5" fill="#CF7B1C" /></g>
              <g className="kc-leg kc-a kc-far"><rect x="40" y="30" width="3.6" height="10" rx="1.8" fill="#CF7B1C" /><ellipse cx="41.8" cy="40.3" rx="2.7" ry="1.5" fill="#CF7B1C" /></g>
              {/* ลำตัว (ก้น+กลาง+อก) */}
              <g className="kc-body">
                <ellipse cx="22" cy="23" rx="12.5" ry="10.5" fill="url(#kcfur)" />
                <ellipse cx="34" cy="22" rx="14" ry="9.5" fill="url(#kcfur)" />
                <ellipse cx="45" cy="23" rx="10" ry="8.5" fill="url(#kcfur)" />
                {/* ลายสลิด */}
                <path d="M20 14 q3 3 0 7 M27 13 q3 3 0 8 M34 13 q3 3 0 8" fill="none" stroke="#C56F14" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
                {/* คอ→หัว */}
                <path d="M48 20 Q52 20 54 15" fill="none" stroke="url(#kcfur)" strokeWidth="9" strokeLinecap="round" />
                <g ref={head} className="kc-head">
                  <path d="M46 8 L48.5 0.5 L53 7 Z" fill="url(#kcfur)" /><path d="M46.5 6.5 L48.4 2.5 L50.5 6 Z" fill="#E7A9A0" />
                  <path d="M54 6.5 L58.5 0.5 L60 8.5 Z" fill="url(#kcfur)" /><path d="M55 6 L58 2.3 L59 7 Z" fill="#E7A9A0" />
                  <ellipse cx="54" cy="14" rx="8.2" ry="7.6" fill="url(#kcfur)" />
                  <ellipse cx="56.5" cy="17.5" rx="3.6" ry="2.6" fill="#F7D9A6" />
                  <g className="kc-eyes">
                    <ellipse cx="52.5" cy="12.5" rx="1.7" ry="2.1" fill="#3A5A32" /><circle cx="52.5" cy="12.7" r=".8" fill="#111" />
                    <ellipse cx="57.5" cy="12.8" rx="1.5" ry="1.9" fill="#3A5A32" /><circle cx="57.5" cy="13" r=".7" fill="#111" />
                  </g>
                  <path d="M55.4 16.4 l1.6 -0.4 Z" /><circle cx="55.6" cy="16.6" r="1" fill="#C9584B" />
                  <path d="M57 16.8 l4 -1 M57 17.8 l4.2 0 M57 18.8 l4 1" stroke="#6b4f34" strokeWidth=".5" strokeLinecap="round" opacity=".8" />
                </g>
              </g>
              {/* ขาใกล้ */}
              <g className="kc-leg kc-a kc-near"><rect x="19" y="29" width="3.8" height="11" rx="1.9" fill="url(#kcfur)" /><ellipse cx="20.9" cy="40.4" rx="2.9" ry="1.6" fill="#E39033" /></g>
              <g className="kc-leg kc-b kc-near"><rect x="43" y="30" width="3.8" height="10" rx="1.9" fill="url(#kcfur)" /><ellipse cx="44.9" cy="40.4" rx="2.9" ry="1.6" fill="#E39033" /></g>
            </g>

            {/* ─── ท่านอนหลับ (ขดตัว) ─── */}
            <g className="g-sleep">
              <g className="s-body">
                <ellipse cx="34" cy="34" rx="21" ry="11.5" fill="url(#kcfur)" />
                <path d="M15 34 C6 33 4 26 9 22 C10 27 13 31 20 32 Z" fill="url(#kcfur)" />{/* หางขดหน้า */}
                <path d="M40 26 q4 3 0 7 M31 25 q4 3 0 8 M22 26 q4 3 0 7" fill="none" stroke="#C56F14" strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
                {/* หัวซุกด้านขวา */}
                <ellipse cx="48" cy="33" rx="8.5" ry="7.8" fill="url(#kcfur)" />
                <path d="M44 27 L46 21 L50 27 Z" fill="url(#kcfur)" /><path d="M50 27 L54 22 L55 29 Z" fill="url(#kcfur)" />
                <path d="M44 33 q3 2 6 0" fill="none" stroke="#5b4a33" strokeWidth="1" strokeLinecap="round" />{/* ตาปิด */}
                <path d="M52 34 l3.5 -.6 M52 35 l3.6 .3" stroke="#6b4f34" strokeWidth=".5" strokeLinecap="round" opacity=".8" />
              </g>
              <text className="s-z" x="56" y="18" fontSize="9" fill="#8aa0b8" fontWeight="700">z</text>
              <text className="s-z s-z2" x="61" y="12" fontSize="7" fill="#a6b6c8" fontWeight="700">z</text>
            </g>
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
.kc{ display:block; filter:drop-shadow(0 3px 3px rgba(0,0,0,.22)); overflow:visible; }
.kc .g-walk, .kc .g-sleep{ display:none; }
.kc.p-walk .g-walk{ display:block; }
.kc.p-sleep .g-sleep{ display:block; }
.kc .kc-leg{ transform-box:fill-box; transform-origin:50% 0; }
.kc .kc-body{ transform-box:fill-box; transform-origin:center; }
.kc .kc-tail{ transform-box:fill-box; transform-origin:100% 100%; }
.kc .kc-head{ transform-box:fill-box; transform-origin:14% 92%; }
.kc .kc-eyes{ transform-box:fill-box; transform-origin:center; animation:kc-blink 4.5s infinite; }
/* เดินอยู่ (moving) เท่านั้นที่ขา/ตัวขยับ */
.kc.p-walk.moving .kc-leg.kc-a{ animation:kc-legA .5s ease-in-out infinite; }
.kc.p-walk.moving .kc-leg.kc-b{ animation:kc-legB .5s ease-in-out infinite; }
.kc.p-walk.moving .kc-body{ animation:kc-bob .25s ease-in-out infinite; }
.kc.p-walk.moving .kc-tail{ animation:kc-wag .5s ease-in-out infinite; }
/* ยืนเฉยๆ หางแกว่งช้าๆ */
.kc.p-walk:not(.moving) .kc-tail{ animation:kc-idletail 3.2s ease-in-out infinite; }
/* เลียขน */
.kc.p-walk.groom .kc-head{ animation:kc-lick 1.1s ease-in-out infinite; }
.kc.p-walk.groom .kc-tail{ animation:kc-curl 3s ease-in-out infinite; }
/* นอนหลับ: หายใจ + Zzz */
.kc.p-sleep .s-body{ transform-box:fill-box; transform-origin:center; animation:kc-breath 2.8s ease-in-out infinite; }
.kc.p-sleep .s-z{ animation:kc-zzz 2.6s ease-in-out infinite; opacity:0; }
.kc.p-sleep .s-z2{ animation-delay:1.3s; }
@keyframes kc-legA{ 0%,100%{ transform:rotate(26deg); } 50%{ transform:rotate(-26deg); } }
@keyframes kc-legB{ 0%,100%{ transform:rotate(-26deg); } 50%{ transform:rotate(26deg); } }
@keyframes kc-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-1.7px); } }
@keyframes kc-wag{ 0%,100%{ transform:rotate(-11deg); } 50%{ transform:rotate(13deg); } }
@keyframes kc-idletail{ 0%,100%{ transform:rotate(-6deg); } 50%{ transform:rotate(10deg); } }
@keyframes kc-lick{ 0%,55%,100%{ transform:rotate(0); } 25%{ transform:rotate(30deg); } 40%{ transform:rotate(24deg); } }
@keyframes kc-curl{ 0%,100%{ transform:rotate(-4deg); } 50%{ transform:rotate(6deg); } }
@keyframes kc-blink{ 0%,92%,100%{ transform:scaleY(1); } 96%{ transform:scaleY(.1); } }
@keyframes kc-breath{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.045); } }
@keyframes kc-zzz{ 0%{ opacity:0; transform:translate(0,4px) scale(.7); } 30%{ opacity:.9; } 100%{ opacity:0; transform:translate(5px,-10px) scale(1.1); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter, .kc-ball{ display:none; } }
@media print{ .kiosk-critter, .kc-ball{ display:none; } }
`
