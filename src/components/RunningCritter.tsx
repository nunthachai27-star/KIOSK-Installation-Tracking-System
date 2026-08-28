'use client'
import { useEffect, useRef, useState } from 'react'

// แมว SVG เดินลื่นแบบอนิเมชัน (ขับด้วย requestAnimationFrame): เดิน · นั่งเลียขน · เล่นลูกบอล ·
// ตอบสนองเมาส์ · นอนหลับ. ขา 2 ท่อน (ต้นขา+แข้ง) มีข้อพับ, ตัวโยก, หางสะบัดต่อเนื่อง, หันหัวมองเมาส์.
// เบา: อัปเดตไม่กี่ทรานส์ฟอร์มต่อเฟรม (rAF หยุดเองเมื่อสลับแท็บ), ไม่มีรูป/ไลบรารี.
// pointer-events:none ไม่บังการกด · เปิด/ปิดจากหน้าธีมสี · เคารพ prefers-reduced-motion.
export const CRITTER_KEY = 'kioskCritter'
export const CRITTER_EVENT = 'kiosk-critter'
const SIZE = 60

function readOn(): boolean {
  try { return localStorage.getItem(CRITTER_KEY) !== 'off' } catch { return true }
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function RunningCritter() {
  const [on, setOn] = useState(true)
  const outer = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const svg = useRef<SVGSVGElement>(null)
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
    const el = outer.current, fc = face.current, sv = svg.current, bl = ball.current
    if (!el || !fc || !sv || !bl) return

    // อ้างอิงชิ้นส่วนที่ขยับต่อเฟรม
    const $ = (s: string) => sv.querySelector(s) as SVGElement | null
    const body = $('.p-body'), headG = $('.p-head'), tail = $('.p-tail')
    const legDefs = [
      { off: 0.0, th: $('.leg-bn .thigh'), sh: $('.leg-bn .shank') },
      { off: Math.PI, th: $('.leg-fn .thigh'), sh: $('.leg-fn .shank') },
      { off: Math.PI, th: $('.leg-bf .thigh'), sh: $('.leg-bf .shank') },
      { off: 0.0, th: $('.leg-ff .thigh'), sh: $('.leg-ff .shank') },
    ]
    const gWalk = $('.g-walk'), gSleep = $('.g-sleep')

    const vw = () => window.innerWidth, vh = () => window.innerHeight
    let alive = true
    let x = Math.random() * (vw() - SIZE - 80) + 40
    let y = Math.random() * (vh() - SIZE - 160) + 120
    let vx = 0, vy = 0
    let tx = x, ty = y, maxSpeed = 120
    let facing = 1, faceSmooth = 1
    let phase = 0, legAmp = 0
    let headLook = 0, groom = 0, groomPh = 0, sleepB = 0
    let mx = -999, my = -999, mouseAt = Date.now(), lastReact = 0
    let mode = 'roam'
    let gen = 0
    let sleepTarget = 0
    let onArrive: (() => void) | null = null
    let timers: number[] = []

    const after = (ms: number, fn: () => void) => { const g = gen; const t = window.setTimeout(() => { if (alive && g === gen) fn() }, ms); timers.push(t) }
    const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const goTo = (nx: number, ny: number, speed: number, arrive: () => void) => {
      tx = clamp(nx, 10, vw() - SIZE - 10); ty = clamp(ny, 66, vh() - SIZE - 10)
      maxSpeed = speed; onArrive = arrive
    }
    const setBall = (bx: number, by: number, dur: number) => { bl.style.transition = `transform ${dur}s ease-out, opacity .25s`; bl.style.transform = `translate(${bx}px,${by}px)`; bl.style.opacity = '1' }
    const hideBall = () => { bl.style.opacity = '0' }

    // ── สเตตพฤติกรรม (เปลี่ยนเป้าหมาย/แฟลก ให้ rAF ค่อยๆ ทำให้ลื่น) ──────────
    const roam = () => { mode = 'roam'; groom = 0; sleepTarget = 0; goTo(rand(10, vw() - SIZE - 10), rand(66, vh() - SIZE - 10), 118, () => after(rand(500, 1500), next)) }
    const rest = () => { mode = 'rest'; sleepTarget = 0; onArrive = null; groom = Math.random() < 0.6 ? 1 : 0; after(rand(2000, 4200), () => { groom = 0; next() }) }
    const chase = () => { mode = 'chase'; groom = 0; sleepTarget = 0; goTo(mx - 30, my - 20, 300, () => after(rand(500, 1300), next)) }
    const sleepMode = () => { mode = 'sleep'; groom = 0; sleepTarget = 1; onArrive = null; after(rand(9000, 20000), () => { sleepTarget = 0; after(900, next) }) }
    const play = () => {
      mode = 'ball'; groom = 0; sleepTarget = 0
      let bx = clamp(x + rand(-140, 140), 20, vw() - 46), by = clamp(y + rand(-90, 90), 66, vh() - 46)
      setBall(bx, by, 0.3)
      let hits = 2 + Math.floor(Math.random() * 3)
      const chaseOnce = () => {
        goTo(bx - 12, by - 2, 175, () => {
          bx = clamp(bx + rand(-170, 170), 20, vw() - 46); by = clamp(by + rand(-130, 130), 66, vh() - 46)
          setBall(bx, by, 0.5)
          if (--hits > 0) after(rand(300, 650), chaseOnce); else after(500, () => { hideBall(); next() })
        })
      }
      after(250, chaseOnce)
    }
    const next = () => {
      if (!alive) return
      gen++; onArrive = null
      const cx = x + 30, cy = y + 22, idle = Date.now() - mouseAt
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
      const cx = x + 30, cy = y + 22, d = Math.hypot(mx - cx, my - cy)
      if (mode === 'sleep' && d < 220) { gen++; onArrive = null; clearTimers(); sleepTarget = 0; after(400, next); return }
      if (d < 150 && Date.now() - lastReact > 2600 && (mode === 'roam' || mode === 'rest')) { lastReact = Date.now(); gen++; onArrive = null; clearTimers(); chase() }
    }
    window.addEventListener('mousemove', onMove)

    // ── ลูปอนิเมชัน ──────────────────────────────────────────────────────────
    let last = 0, raf = 0
    const frame = (t: number) => {
      if (!alive) return
      const dt = last ? clamp((t - last) / 1000, 0, 0.05) : 0.016
      last = t

      // เคลื่อนที่แบบเร่ง-ชะลอนุ่ม เข้าหาเป้าหมาย
      const dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy)
      if (dist > 1) {
        const want = Math.min(maxSpeed, dist * 3.2) // ชะลอเมื่อใกล้
        const nx = dx / dist, ny = dy / dist
        vx = lerp(vx, nx * want, 1 - Math.pow(0.0016, dt))
        vy = lerp(vy, ny * want, 1 - Math.pow(0.0016, dt))
      } else { vx = lerp(vx, 0, 0.2); vy = lerp(vy, 0, 0.2) }
      x += vx * dt; y += vy * dt
      const speed = Math.hypot(vx, vy)
      if (onArrive && dist < 8) { const cb = onArrive; onArrive = null; cb() }

      // ทิศหันหน้า (นุ่ม)
      if (Math.abs(vx) > 6) facing = vx < 0 ? -1 : 1
      faceSmooth = lerp(faceSmooth, facing, 1 - Math.pow(0.0001, dt))
      el.style.transform = `translate(${x}px,${y}px)`
      fc.style.transform = `scaleX(${faceSmooth})`

      // เดิน: จังหวะขาแปรตามความเร็ว
      const walking = speed > 8 ? 1 : 0
      legAmp = lerp(legAmp, walking, 1 - Math.pow(0.02, dt))
      phase += speed * 0.055 * dt + (walking ? 0 : 0)
      sleepB = lerp(sleepB, sleepTarget, 1 - Math.pow(0.02, dt))

      if (gWalk) gWalk.style.opacity = String(clamp(1 - sleepB * 1.4, 0, 1))
      if (gSleep) gSleep.style.opacity = String(clamp((sleepB - 0.15) * 1.4, 0, 1))

      // ขา 2 ท่อน
      for (const L of legDefs) {
        if (!L.th || !L.sh) continue
        const s = Math.sin(phase + L.off)
        const thA = legAmp * 26 * s
        const shA = -legAmp * 16 * (0.5 + 0.5 * Math.sin(phase + L.off - 0.7)) - legAmp * 4
        L.th.style.transform = `rotate(${thA}deg)`
        L.sh.style.transform = `rotate(${shA}deg)`
      }
      // ตัวโยก+ก้มเล็กน้อย
      if (body) {
        const bob = -legAmp * 1.7 * (0.5 + 0.5 * Math.sin(2 * phase))
        const pitch = legAmp * 2.2 * Math.sin(2 * phase)
        body.style.transform = `translateY(${bob}px) rotate(${pitch}deg)`
      }
      // หัว: มองเมาส์ (นุ่ม) หรือก้มเลียขน
      if (headG) {
        if (groom) { groomPh += dt * 5; headLook = lerp(headLook, 22 + 10 * Math.sin(groomPh), 0.2) }
        else {
          const cx = x + 30, cy = y + 14
          const look = (mouseAt && Date.now() - mouseAt < 3500) ? clamp((my - cy) / 26, -13, 13) : 0
          headLook = lerp(headLook, look + (walking ? 1.2 * Math.sin(2 * phase) : 0), 0.12)
        }
        headG.style.transform = `rotate(${headLook}deg)`
      }
      // หางสะบัดต่อเนื่อง
      if (tail) {
        const wag = (walking ? 12 : 6) * Math.sin(phase * (walking ? 1 : 0.5) + 0.6) + (groom ? -8 : 0)
        tail.style.transform = `rotate(${wag}deg)`
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    after(400, next)

    return () => { alive = false; clearTimers(); cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
  }, [on])

  if (!on) return null
  const leg = (cls: string, hx: number, kneeY: number, near: boolean) => (
    <g className={cls}>
      <g className="thigh">
        <rect x={hx - 1.7} y="26.5" width="3.4" height={kneeY - 26.5} rx="1.7" fill={near ? 'url(#kcfur)' : '#CF7B1C'} opacity={near ? 1 : 0.82} />
        <g className="shank">
          <rect x={hx - 1.5} y={kneeY} width="3" height={40 - kneeY} rx="1.5" fill={near ? 'url(#kcfur)' : '#CF7B1C'} opacity={near ? 1 : 0.82} />
          <ellipse cx={hx + 0.1} cy="40.2" rx="2.8" ry="1.5" fill={near ? '#E39033' : '#CF7B1C'} opacity={near ? 1 : 0.82} />
        </g>
      </g>
    </g>
  )
  return (
    <>
      <div ref={ball} className="kc-ball" aria-hidden="true">🧶</div>
      <div ref={outer} className="kiosk-critter" aria-hidden="true">
        <span ref={face} className="kiosk-critter-face">
          <svg ref={svg} className="kc" viewBox="0 0 72 46" width="60" height="38">
            <defs>
              <linearGradient id="kcfur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2A64A" /><stop offset="1" stopColor="#DC831C" /></linearGradient>
            </defs>

            <g className="g-walk">
              {/* หาง */}
              <path className="p-tail" d="M13 22 C4 20 0 12 4 5 C6 10 9 15 16 18 C15 20 14 21 13 22 Z" fill="url(#kcfur)" />
              {/* ขาไกล */}
              {leg('leg-bf', 25, 33, false)}
              {leg('leg-ff', 40, 34, false)}
              {/* ลำตัว + หัว */}
              <g className="p-body">
                <ellipse cx="22" cy="22" rx="12.5" ry="10.3" fill="url(#kcfur)" />
                <ellipse cx="34" cy="21" rx="14" ry="9.3" fill="url(#kcfur)" />
                <ellipse cx="45" cy="22" rx="10" ry="8.3" fill="url(#kcfur)" />
                <path d="M20 13 q3 3 0 7 M27 12 q3 3 0 8 M34 12 q3 3 0 8" fill="none" stroke="#C56F14" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
                <path d="M48 19 Q52 19 54 14" fill="none" stroke="url(#kcfur)" strokeWidth="9" strokeLinecap="round" />
                <g className="p-head">
                  <path d="M46 7 L48.5 -0.5 L53 6 Z" fill="url(#kcfur)" /><path d="M46.6 5.6 L48.4 1.7 L50.4 5.2 Z" fill="#E7A9A0" />
                  <path d="M54 5.6 L58.5 -0.5 L60 7.6 Z" fill="url(#kcfur)" /><path d="M55 5.2 L58 1.6 L59 6.2 Z" fill="#E7A9A0" />
                  <ellipse cx="54" cy="13" rx="8.2" ry="7.6" fill="url(#kcfur)" />
                  <ellipse cx="56.5" cy="16.5" rx="3.6" ry="2.6" fill="#F7D9A6" />
                  <g className="kc-eyes">
                    <ellipse cx="52.5" cy="11.5" rx="1.7" ry="2.1" fill="#3A5A32" /><circle cx="52.5" cy="11.7" r=".8" fill="#111" />
                    <ellipse cx="57.5" cy="11.8" rx="1.5" ry="1.9" fill="#3A5A32" /><circle cx="57.5" cy="12" r=".7" fill="#111" />
                  </g>
                  <circle cx="55.6" cy="15.6" r="1" fill="#C9584B" />
                  <path d="M57 15.8 l4 -1 M57 16.8 l4.2 0 M57 17.8 l4 1" stroke="#6b4f34" strokeWidth=".5" strokeLinecap="round" opacity=".8" />
                </g>
              </g>
              {/* ขาใกล้ */}
              {leg('leg-bn', 19, 33, true)}
              {leg('leg-fn', 43, 34, true)}
            </g>

            {/* ท่านอนหลับ */}
            <g className="g-sleep">
              <g className="s-body">
                <ellipse cx="34" cy="34" rx="21" ry="11.5" fill="url(#kcfur)" />
                <path d="M15 34 C6 33 4 26 9 22 C10 27 13 31 20 32 Z" fill="url(#kcfur)" />
                <path d="M40 26 q4 3 0 7 M31 25 q4 3 0 8 M22 26 q4 3 0 7" fill="none" stroke="#C56F14" strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
                <ellipse cx="48" cy="33" rx="8.5" ry="7.8" fill="url(#kcfur)" />
                <path d="M44 27 L46 21 L50 27 Z" fill="url(#kcfur)" /><path d="M50 27 L54 22 L55 29 Z" fill="url(#kcfur)" />
                <path d="M44 33 q3 2 6 0" fill="none" stroke="#5b4a33" strokeWidth="1" strokeLinecap="round" />
              </g>
              <text className="s-z" x="56" y="17" fontSize="9" fill="#8aa0b8" fontWeight="700">z</text>
              <text className="s-z s-z2" x="61" y="11" fontSize="7" fill="#a6b6c8" fontWeight="700">z</text>
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
.kc .g-sleep{ opacity:0; }
.kc .thigh{ transform-box:fill-box; transform-origin:50% 1px; }
.kc .shank{ transform-box:fill-box; transform-origin:50% 1px; }
.kc .p-body{ transform-box:fill-box; transform-origin:50% 62%; }
.kc .p-head{ transform-box:fill-box; transform-origin:16% 90%; }
.kc .p-tail{ transform-box:fill-box; transform-origin:100% 100%; }
.kc .kc-eyes{ transform-box:fill-box; transform-origin:center; animation:kc-blink 4.5s infinite; }
.kc .s-body{ transform-box:fill-box; transform-origin:center; animation:kc-breath 2.8s ease-in-out infinite; }
.kc .s-z{ animation:kc-zzz 2.6s ease-in-out infinite; opacity:0; }
.kc .s-z2{ animation-delay:1.3s; }
@keyframes kc-blink{ 0%,92%,100%{ transform:scaleY(1); } 96%{ transform:scaleY(.1); } }
@keyframes kc-breath{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.05); } }
@keyframes kc-zzz{ 0%{ opacity:0; transform:translate(0,4px) scale(.7); } 30%{ opacity:.9; } 100%{ opacity:0; transform:translate(5px,-10px) scale(1.1); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter, .kc-ball{ display:none; } }
@media print{ .kiosk-critter, .kc-ball{ display:none; } }
`
