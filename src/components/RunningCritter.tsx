'use client'
import { useEffect, useRef, useState } from 'react'

// ลูกแมวส้ม SVG เดินเล่นทั่วหน้าจอ (ขับด้วย requestAnimationFrame): เดินวนแบบสัตว์จริง ·
// นั่งเลียขน · เล่นลูกบอล · ตอบสนองเมาส์ · นอนหลับ. ขา 2 ท่อน, ตากะพริบ, หางสะบัด, มีเงา+เส้นสปีด.
// เบา: อัปเดตไม่กี่ทรานส์ฟอร์มต่อเฟรม (rAF หยุดเองเมื่อสลับแท็บ) · pointer-events:none ไม่บังการกด
// เปิด/ปิดจากหน้าธีมสี · เคารพ prefers-reduced-motion.
export const CRITTER_KEY = 'kioskCritter'
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 76

function readOn(): boolean {
  try { return localStorage.getItem(CRITTER_KEY) !== 'off' } catch { return true }
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function RunningCritter() {
  const [on, setOn] = useState(true)
  const outer = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const ball = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)

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
    const el = outer.current, sv = svg.current, bl = ball.current, sh = shadow.current
    if (!el || !sv || !bl || !sh) return

    const $ = (s: string) => sv.querySelector(s) as SVGElement | null
    const body = $('.p-body'), headG = $('.p-head'), tail = $('.p-tail'), speedL = $('.speed')
    const gWalk = $('.g-walk'), gSleep = $('.g-sleep')
    const legs = [
      { off: 0.0, th: $('.leg-bn .thigh'), sh: $('.leg-bn .shank') },
      { off: Math.PI, th: $('.leg-fn .thigh'), sh: $('.leg-fn .shank') },
      { off: Math.PI, th: $('.leg-bf .thigh'), sh: $('.leg-bf .shank') },
      { off: 0.0, th: $('.leg-ff .thigh'), sh: $('.leg-ff .shank') },
    ]

    const vw = () => window.innerWidth, vh = () => window.innerHeight
    let alive = true
    let gen = 0, mode = 'roam'
    let x = Math.random() * (vw() - SIZE - 80) + 40, y = Math.random() * (vh() - SIZE - 200) + 120
    let vx = 0, vy = 0, tx = x, ty = y, maxSpeed = 120, facing = 1, fs = 1
    let phase = 0, legAmp = 0, headLook = 0, groom = 0, groomPh = 0, sleepB = 0, sleepTarget = 0
    let wandering = false, dir = Math.random() * 6.283, wanderSpeed = 90
    let mx = -999, my = -999, mouseAt = Date.now(), lastReact = 0
    let onArrive: (() => void) | null = null
    let timers: number[] = []

    const after = (ms: number, fn: () => void) => { const g = gen; const t = window.setTimeout(() => { if (alive && g === gen) fn() }, ms); timers.push(t) }
    const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const angLerp = (a: number, b: number, t: number) => { let d = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * t }
    const goTo = (nx: number, ny: number, sp: number, arr: () => void) => { tx = clamp(nx, 10, vw() - SIZE - 10); ty = clamp(ny, 66, vh() - SIZE - 10); maxSpeed = sp; onArrive = arr }
    const setBall = (bx: number, by: number, d: number) => { bl.style.transition = `transform ${d}s ease-out, opacity .25s`; bl.style.transform = `translate(${bx}px,${by}px)`; bl.style.opacity = '1' }
    const hideBall = () => { bl.style.opacity = '0' }

    const roam = () => {
      mode = 'roam'; groom = 0; sleepTarget = 0; wandering = true; onArrive = null
      dir = (Math.abs(vx) + Math.abs(vy) > 5) ? Math.atan2(vy, vx) : rand(0, 6.283)
      wanderSpeed = rand(58, 122)
      after(rand(4000, 9000), next)
    }
    const rest = () => { mode = 'rest'; wandering = false; sleepTarget = 0; onArrive = null; groom = Math.random() < 0.6 ? 1 : 0; after(rand(2000, 4200), () => { groom = 0; next() }) }
    const chase = () => { mode = 'chase'; wandering = false; groom = 0; sleepTarget = 0; goTo(mx - 38, my - 30, 300, () => after(rand(500, 1300), next)) }
    const sleepMode = () => { mode = 'sleep'; wandering = false; groom = 0; sleepTarget = 1; onArrive = null; after(rand(9000, 20000), () => { sleepTarget = 0; after(900, next) }) }
    const play = () => {
      mode = 'ball'; wandering = false; groom = 0; sleepTarget = 0
      let bx = clamp(x + rand(-140, 140), 20, vw() - 46), by = clamp(y + rand(-90, 90), 66, vh() - 46)
      setBall(bx, by, 0.3)
      let hits = 2 + Math.floor(Math.random() * 3)
      const once = () => { goTo(bx - 34, by - 26, 175, () => { bx = clamp(bx + rand(-170, 170), 20, vw() - 46); by = clamp(by + rand(-130, 130), 66, vh() - 46); setBall(bx, by, 0.5); if (--hits > 0) after(rand(300, 650), once); else after(500, () => { hideBall(); next() }) }) }
      after(250, once)
    }
    const next = () => {
      if (!alive) return
      gen++; onArrive = null; wandering = false
      const cx = x + 38, cy = y + 30, idle = Date.now() - mouseAt
      const near = idle < 4000 && Math.hypot(mx - cx, my - cy) < 420
      if (idle > 14000 && Math.random() < 0.6) return sleepMode()
      const r = Math.random()
      if (near && r < 0.55) return chase()
      if (r < 0.4) return roam()
      if (r < 0.72) return rest()
      return play()
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY; mouseAt = Date.now()
      const cx = x + 38, cy = y + 30, d = Math.hypot(mx - cx, my - cy)
      if (mode === 'sleep' && d < 240) { gen++; onArrive = null; clearTimers(); sleepTarget = 0; after(400, next); return }
      if (d < 160 && Date.now() - lastReact > 2600 && (mode === 'roam' || mode === 'rest')) { lastReact = Date.now(); gen++; onArrive = null; clearTimers(); chase() }
    }
    window.addEventListener('mousemove', onMove)

    let last = 0, raf = 0
    const frame = (t: number) => {
      if (!alive) return
      // หยุดคำนวณ/วาดเมื่อสลับไปแท็บ/หน้าต่างอื่น (ลด CPU) — กลับมาค่อยวิ่งต่อ
      if (typeof document !== 'undefined' && document.hidden) { last = 0; raf = requestAnimationFrame(frame); return }
      const dt = last ? clamp((t - last) / 1000, 0, 0.05) : 0.016
      last = t

      if (wandering) {
        dir += (Math.random() - 0.5) * 2.4 * dt
        const bw = vw(), bh = vh(), m = 46
        if (x < m || x > bw - SIZE - m || y < 74 || y > bh - SIZE - m) {
          const toC = Math.atan2((bh * 0.56) - y, (bw / 2) - x)
          dir = angLerp(dir, toC, 1 - Math.pow(0.02, dt))
        }
        const tvx = Math.cos(dir) * wanderSpeed, tvy = Math.sin(dir) * wanderSpeed
        vx = lerp(vx, tvx, 1 - Math.pow(0.02, dt)); vy = lerp(vy, tvy, 1 - Math.pow(0.02, dt))
        x = clamp(x + vx * dt, 6, bw - SIZE - 6); y = clamp(y + vy * dt, 66, bh - SIZE - 6)
      } else {
        const dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy)
        if (dist > 1) {
          const want = Math.min(maxSpeed, dist * 3.2), nx = dx / dist, ny = dy / dist
          vx = lerp(vx, nx * want, 1 - Math.pow(0.0016, dt)); vy = lerp(vy, ny * want, 1 - Math.pow(0.0016, dt))
        } else { vx = lerp(vx, 0, 0.2); vy = lerp(vy, 0, 0.2) }
        x += vx * dt; y += vy * dt
        if (onArrive && dist < 8) { const cb = onArrive; onArrive = null; cb() }
      }
      const speed = Math.hypot(vx, vy)

      if (Math.abs(vx) > 6) facing = vx < 0 ? -1 : 1
      fs = lerp(fs, facing, 1 - Math.pow(0.0001, dt))
      el.style.transform = `translate(${x}px,${y}px) scaleX(${fs})`
      sh.style.transform = `translate(${x + 14}px,${y + 62}px)`
      sh.style.opacity = String(0.8 * (1 - sleepB * 0.4))

      const walking = speed > 8 ? 1 : 0
      legAmp = lerp(legAmp, walking, 1 - Math.pow(0.02, dt))
      phase += speed * 0.05 * dt
      sleepB = lerp(sleepB, sleepTarget, 1 - Math.pow(0.02, dt))
      if (gWalk) gWalk.style.opacity = String(clamp(1 - sleepB * 1.4, 0, 1))
      if (gSleep) gSleep.style.opacity = String(clamp((sleepB - 0.15) * 1.4, 0, 1))
      if (speedL) speedL.style.opacity = speed > 150 ? '0.85' : '0'

      for (const L of legs) {
        if (!L.th || !L.sh) continue
        const s = Math.sin(phase + L.off)
        L.th.style.transform = `rotate(${legAmp * 26 * s}deg)`
        L.sh.style.transform = `rotate(${-legAmp * 16 * (0.5 + 0.5 * Math.sin(phase + L.off - 0.7)) - legAmp * 4}deg)`
      }
      if (body) body.style.transform = `translateY(${-legAmp * 1.8 * (0.5 + 0.5 * Math.sin(2 * phase))}px) rotate(${legAmp * 2.2 * Math.sin(2 * phase)}deg)`
      if (headG) {
        if (groom) { groomPh += dt * 5; headLook = lerp(headLook, 22 + 10 * Math.sin(groomPh), 0.2) }
        else { const cy = y + 18, look = (Date.now() - mouseAt < 3500) ? clamp((my - cy) / 26, -13, 13) : 0; headLook = lerp(headLook, look + (walking ? 1.2 * Math.sin(2 * phase) : 0), 0.12) }
        headG.style.transform = `rotate(${headLook}deg)`
      }
      if (tail) tail.style.transform = `rotate(${(walking ? 12 : 6) * Math.sin(phase * (walking ? 1 : 0.5) + 0.6) + (groom ? -8 : 0)}deg)`

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    after(400, next)

    return () => { alive = false; clearTimers(); cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
  }, [on])

  if (!on) return null
  return (
    <>
      <div ref={shadow} className="kc-shadow" aria-hidden="true" />
      <div ref={ball} className="kc-ball" aria-hidden="true">🧶</div>
      <div ref={outer} className="kiosk-critter" aria-hidden="true">
        <svg ref={svg} className="kc" viewBox="0 0 76 56" width="76" height="56">
          <defs>
            <linearGradient id="kcfur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6B25A" /><stop offset="1" stopColor="#E2831B" /></linearGradient>
            <linearGradient id="kcfurL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBD59A" /><stop offset="1" stopColor="#F1B267" /></linearGradient>
          </defs>

          <g className="g-walk">
            <g className="speed" style={{ opacity: 0 }}>
              <line x1="2" y1="20" x2="14" y2="20" stroke="#C7CEDA" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="28" x2="12" y2="28" stroke="#C7CEDA" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="36" x2="13" y2="36" stroke="#C7CEDA" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g className="p-tail">
              <path d="M17 30 C6 28 2 17 8 8 C11 14 15 20 22 24 C21 27 19 29 17 30 Z" fill="url(#kcfur)" />
              <path d="M9 12 q3 2 4 6 M6 19 q4 1 6 5" stroke="#C56F14" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".65" />
            </g>
            <g className="leg-bf"><g className="thigh"><rect x="26" y="33" width="4" height="8" rx="2" fill="#CF7B1C" /><g className="shank"><rect x="26.3" y="40" width="3.4" height="7" rx="1.7" fill="#CF7B1C" /><ellipse cx="28" cy="47.4" rx="3.1" ry="1.7" fill="#CF7B1C" /></g></g></g>
            <g className="leg-ff"><g className="thigh"><rect x="44" y="34" width="4" height="7" rx="2" fill="#CF7B1C" /><g className="shank"><rect x="44.3" y="40" width="3.4" height="7" rx="1.7" fill="#CF7B1C" /><ellipse cx="46" cy="47.4" rx="3.1" ry="1.7" fill="#CF7B1C" /></g></g></g>
            <g className="p-body">
              <ellipse cx="25" cy="31" rx="14" ry="11.5" fill="url(#kcfur)" />
              <ellipse cx="37" cy="30" rx="15" ry="11" fill="url(#kcfur)" />
              <path d="M14 20 q3 4 1 9 M22 17 q3 4 1 10 M30 17 q3 4 1 10 M38 18 q3 4 1 9" fill="none" stroke="#C56F14" strokeWidth="1.7" strokeLinecap="round" opacity=".6" />
              <ellipse cx="32" cy="38" rx="12" ry="6" fill="url(#kcfurL)" opacity=".8" />
              <g className="p-head">
                <path d="M46 10 L49 -1 L57 8 Z" fill="url(#kcfur)" /><path d="M47 8 L49.2 1.5 L53 7 Z" fill="#EBA69B" />
                <path d="M58 8 L66 -1 L68 11 Z" fill="url(#kcfur)" /><path d="M58.5 8 L64 2 L66 10 Z" fill="#EBA69B" />
                <ellipse cx="57" cy="19" rx="13" ry="12" fill="url(#kcfur)" />
                <ellipse cx="47" cy="23" rx="4.5" ry="4" fill="url(#kcfurL)" /><ellipse cx="67" cy="23" rx="4.5" ry="4" fill="url(#kcfurL)" />
                <path d="M52 9 l1.5 6 M57 8 l0 6.5 M62 9 l-1.5 6" stroke="#C56F14" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
                <ellipse cx="57" cy="24" rx="8" ry="6" fill="url(#kcfurL)" />
                <g className="kc-eyes">
                  <ellipse cx="51.5" cy="18" rx="3.3" ry="3.7" fill="#fff" /><circle cx="51.8" cy="18.4" r="2.4" fill="#5B3A1A" /><circle cx="51.8" cy="18.4" r="1.1" fill="#1a1008" /><circle cx="50.9" cy="17.3" r=".8" fill="#fff" />
                  <ellipse cx="62.5" cy="18" rx="3.3" ry="3.7" fill="#fff" /><circle cx="62.2" cy="18.4" r="2.4" fill="#5B3A1A" /><circle cx="62.2" cy="18.4" r="1.1" fill="#1a1008" /><circle cx="61.3" cy="17.3" r=".8" fill="#fff" />
                </g>
                <path d="M55.6 22.6 h2.8 l-1.4 1.6 Z" fill="#C9584B" />
                <path d="M57 24.2 q-1.6 2 -3.4 1 M57 24.2 q1.6 2 3.4 1" fill="none" stroke="#9c6b4a" strokeWidth=".7" strokeLinecap="round" />
                <path d="M60 22 l7 -1.5 M60 24 l7 .3 M46 22 l-7 -1.5 M46 24 l-7 .3" stroke="#7a5a3a" strokeWidth=".5" strokeLinecap="round" opacity=".7" />
              </g>
              <path d="M49 30 q8 5 16 0" fill="none" stroke="#D64B57" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="57" cy="33.5" r="2.4" fill="#F6C845" stroke="#D9A72B" strokeWidth=".7" /><circle cx="57" cy="33.8" r=".7" fill="#8a6a10" />
            </g>
            <g className="leg-bn"><g className="thigh"><rect x="19" y="33" width="4.2" height="8" rx="2.1" fill="url(#kcfur)" /><g className="shank"><rect x="19.3" y="40" width="3.6" height="7" rx="1.8" fill="url(#kcfur)" /><ellipse cx="21.1" cy="47.6" rx="3.3" ry="1.9" fill="#F4E7D2" /></g></g></g>
            <g className="leg-fn"><g className="thigh"><rect x="47" y="34" width="4.2" height="7" rx="2.1" fill="url(#kcfur)" /><g className="shank"><rect x="47.3" y="40" width="3.6" height="7" rx="1.8" fill="url(#kcfur)" /><ellipse cx="49.1" cy="47.6" rx="3.3" ry="1.9" fill="#F4E7D2" /></g></g></g>
          </g>

          <g className="g-sleep">
            <g className="s-body">
              <ellipse cx="38" cy="42" rx="23" ry="12.5" fill="url(#kcfur)" />
              <path d="M17 42 C6 41 4 32 10 27 C11 33 15 37 23 39 Z" fill="url(#kcfur)" />
              <path d="M45 33 q4 3 0 8 M35 32 q4 3 0 9 M25 33 q4 3 0 8" stroke="#C56F14" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55" />
              <ellipse cx="53" cy="41" rx="10" ry="9" fill="url(#kcfur)" />
              <path d="M48 34 L51 27 L56 34 Z" fill="url(#kcfur)" /><path d="M56 34 L61 28 L62 36 Z" fill="url(#kcfur)" />
              <ellipse cx="53" cy="43" rx="6" ry="4" fill="url(#kcfurL)" />
              <path d="M48 41 q3 2 6 0" fill="none" stroke="#5b4a33" strokeWidth="1.1" strokeLinecap="round" />
              <path d="M56 42 l4 -.6 M56 43 l4 .3" stroke="#7a5a3a" strokeWidth=".5" strokeLinecap="round" opacity=".7" />
            </g>
            <text className="s-z" x="60" y="22" fontSize="11" fill="#8aa0b8" fontWeight="700">z</text>
            <text className="s-z s-z2" x="66" y="14" fontSize="8" fill="#a6b6c8" fontWeight="700">z</text>
          </g>
        </svg>
        <style>{CSS}</style>
      </div>
    </>
  )
}

const CSS = `
.kiosk-critter{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; will-change:transform; }
.kc-ball{ position:fixed; left:0; top:0; z-index:5; pointer-events:none; user-select:none; font-size:22px; line-height:1; opacity:0; will-change:transform,opacity; filter:drop-shadow(0 2px 2px rgba(0,0,0,.2)); }
.kc-shadow{ position:fixed; left:0; top:0; z-index:4; width:50px; height:12px; border-radius:50%; background:rgba(20,25,35,.16); filter:blur(2px); pointer-events:none; will-change:transform,opacity; }
.kc{ display:block; overflow:visible; filter:drop-shadow(0 3px 3px rgba(20,20,20,.22)); }
.kc .g-sleep{ opacity:0; }
.kc .thigh, .kc .shank{ transform-box:fill-box; transform-origin:50% 1px; }
.kc .p-body{ transform-box:fill-box; transform-origin:50% 64%; }
.kc .p-head{ transform-box:fill-box; transform-origin:22% 88%; }
.kc .p-tail{ transform-box:fill-box; transform-origin:100% 100%; }
.kc .speed{ transition:opacity .18s; }
.kc .kc-eyes{ transform-box:fill-box; transform-origin:center; animation:kc-blink 4.5s infinite; }
.kc .s-body{ transform-box:fill-box; transform-origin:center; animation:kc-breath 2.8s ease-in-out infinite; }
.kc .s-z{ animation:kc-zzz 2.6s ease-in-out infinite; opacity:0; }
.kc .s-z2{ animation-delay:1.3s; }
@keyframes kc-blink{ 0%,93%,100%{ transform:scaleY(1); } 96%{ transform:scaleY(.1); } }
@keyframes kc-breath{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.05); } }
@keyframes kc-zzz{ 0%{ opacity:0; transform:translate(0,4px) scale(.7); } 30%{ opacity:.9; } 100%{ opacity:0; transform:translate(6px,-12px) scale(1.1); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter, .kc-ball, .kc-shadow{ display:none; } }
@media print{ .kiosk-critter, .kc-ball, .kc-shadow{ display:none; } }
`
