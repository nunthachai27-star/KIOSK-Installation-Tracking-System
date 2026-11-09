'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VIRA_PENDING_EVENT, VIRA_REFRESH_EVENT } from '@/lib/vira-shared'

// แจ้งเตือนเรื่องจาก Vira (Call Center) ที่ยังไม่มีคนรับ: poll ทุก 30 วิ
// มีค้าง → กล่องลอยมุมจอ + เสียงดังซ้ำทุก 30 วิ จนกว่าจะมีคนกด "รับงาน" (เลื่อนเสียงได้ 15 นาที)
// เบราว์เซอร์ไม่ยอมให้เล่นเสียงจนกว่าจะมีการคลิกในหน้าครั้งแรก → เตรียม AudioContext ไว้ตอนคลิก
const POLL_MS = 30_000
const SNOOZE_MS = 15 * 60_000
const SNOOZE_KEY = 'viraSnoozeUntil'

type Latest = { id: string; title: string; hospitalName: string | null } | null

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    const Ctor = AC.AudioContext || AC.webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

// เสียงให้เลือก (เลือกแยกแต่ละเครื่อง เก็บใน localStorage) — ทุกเสียงผ่าน compressor + gain สูง ให้ดังสุดที่ไม่แตก
export const VIRA_SOUNDS = {
  voice: 'พูด “งานเข้า งานเข้า”',
  voiceChime: 'ติ๊งต่อง + “งานเข้า งานเข้า”',
  phone: 'กริ่งโทรศัพท์',
  siren: 'ไซเรน',
  bell: 'ระฆัง',
  beep: 'บี๊บเตือนภัย',
  doorbell: 'กริ่งประตู',
  alarm: 'นาฬิกาปลุก',
  marimba: 'มาริมบา',
  nurse: 'กริ่งเรียกพยาบาล',
  horn: 'แตร',
  ping: 'ข้อความเข้า',
} as const
const VOICE_TEXT = 'งานเข้า งานเข้า'
type SoundKey = keyof typeof VIRA_SOUNDS
const SOUND_KEY = 'viraSound'

function out(c: AudioContext): AudioNode {
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 8
  const master = c.createGain(); master.gain.value = 1.6
  comp.connect(master); master.connect(c.destination)
  return comp
}
function tone(c: AudioContext, dest: AudioNode, type: OscillatorType, freq: number, t: number, dur: number, vol = 0.9) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  o.connect(g); g.connect(dest)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.setValueAtTime(vol, t + dur - 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t); o.stop(t + dur + 0.02)
  return o
}

// โน้ตแบบระฆัง/มาริมบา (ตีแล้วค่อย ๆ จาง)
function bellNote(c: AudioContext, d: AudioNode, f: number, t: number, dur: number) {
  for (const [type, mult, vol, len] of [['sine', 1, 1, dur], ['triangle', 2.01, 0.35, dur * 0.5]] as const) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.value = f * mult; o.connect(g); g.connect(d)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.start(t); o.stop(t + len + 0.02)
  }
}

// อ่านออกเสียงภาษาไทยด้วยเสียงในเบราว์เซอร์ (Edge/Chrome มีเสียงไทย) — ไม่มีเสียงไทย = false ให้ใช้กริ่งแทน
function speak(text: string): boolean {
  if (!('speechSynthesis' in window)) return false
  const vs = speechSynthesis.getVoices()
  const v = vs.find((x) => /^th/i.test(x.lang) && /natural|online|premwadee|niwat/i.test(x.name)) || vs.find((x) => /^th/i.test(x.lang))
  if (!v) return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = v; u.lang = 'th-TH'; u.volume = 1; u.pitch = 1.1
  speechSynthesis.speak(u)
  return true
}

function play(kind: SoundKey): boolean {
  const c = audio()
  if (!c || c.state !== 'running') return false // ยังไม่มีการคลิกในหน้า — เบราว์เซอร์บล็อกทั้งกริ่งและเสียงพูด
  if (kind === 'voice') return speak(VOICE_TEXT) || play('doorbell')
  if (kind === 'voiceChime') { play('doorbell'); window.setTimeout(() => speak(VOICE_TEXT), 1300); return true }
  const d = out(c), t0 = c.currentTime + 0.05
  if (kind === 'doorbell') {
    for (const [s, f, len] of [[0, 659, 0.8], [0.45, 523, 1.4], [1.6, 659, 0.8], [2.05, 523, 1.4]]) bellNote(c, d, f, t0 + s, len)
  } else if (kind === 'alarm') {
    for (let g = 0; g < 4; g++) for (let k = 0; k < 8; k++) tone(c, d, 'square', k % 2 ? 2000 : 2400, t0 + g * 0.6 + k * 0.045, 0.04, 0.5)
  } else if (kind === 'marimba') {
    for (const [s, f] of [[0, 784], [0.16, 988], [0.32, 1175], [0.48, 988], [0.72, 1568]]) { bellNote(c, d, f, t0 + s, 0.5); tone(c, d, 'sine', f * 4, t0 + s, 0.05, 0.25) }
  } else if (kind === 'nurse') {
    for (const r of [0, 1.3]) for (const [s, f] of [[0, 1047], [0.3, 880], [0.6, 698]]) bellNote(c, d, f, t0 + r + s, 0.9)
  } else if (kind === 'horn') {
    for (const s of [0, 0.55]) { tone(c, d, 'sawtooth', 220, t0 + s, 0.38, 0.6); tone(c, d, 'sawtooth', 277, t0 + s, 0.38, 0.45); tone(c, d, 'square', 330, t0 + s, 0.38, 0.25) }
  } else if (kind === 'ping') {
    for (let k = 0; k < 3; k++) { bellNote(c, d, 1760, t0 + k * 0.35, 0.35); tone(c, d, 'sine', 2640, t0 + k * 0.35, 0.08, 0.3) }
  } else if (kind === 'phone') {
    // กริ่งโทรศัพท์บ้าน: 2 ความถี่ผสมกัน สั่นเร็ว ๆ 2 ช่วง
    for (const start of [0, 1.4]) for (let k = 0; k < 20; k++) {
      const t = t0 + start + k * 0.05
      tone(c, d, 'square', 440, t, 0.025, 0.45); tone(c, d, 'square', 480, t, 0.025, 0.45)
    }
  } else if (kind === 'siren') {
    // ไซเรนขึ้นลง 3 รอบ
    const o = tone(c, d, 'sawtooth', 650, t0, 2.4, 0.7)
    for (let k = 0; k < 3; k++) { o.frequency.linearRampToValueAtTime(1300, t0 + k * 0.8 + 0.4); o.frequency.linearRampToValueAtTime(650, t0 + k * 0.8 + 0.8) }
  } else if (kind === 'bell') {
    // ระฆัง ดัง-ค้าง 3 ครั้ง
    for (const [i, f] of [1319, 1047, 1319].entries()) {
      const t = t0 + i * 0.55
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(d)
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      o.start(t); o.stop(t + 1.25)
      tone(c, d, 'triangle', f * 2, t, 0.3, 0.3)
    }
  } else {
    // บี๊บถี่ ๆ แบบสัญญาณเตือน
    for (let k = 0; k < 6; k++) tone(c, d, 'square', 1800, t0 + k * 0.28, 0.16, 0.6)
  }
  return true
}

const readSnooze = () => { try { return Number(localStorage.getItem(SNOOZE_KEY)) || 0 } catch { return 0 } }
const readSound = (): SoundKey => { try { const v = localStorage.getItem(SOUND_KEY); return v && v in VIRA_SOUNDS ? (v as SoundKey) : 'beep' } catch { return 'beep' } }

export function ViraNotifier({ canAccept }: { canAccept: boolean }) {
  const path = usePathname()
  const [count, setCount] = useState(0)
  const [latest, setLatest] = useState<Latest>(null)
  const [snoozeUntil, setSnoozeUntil] = useState(readSnooze)
  const [snoozed, setSnoozed] = useState(false)
  const [needClick, setNeedClick] = useState(false)
  const [sound, setSound] = useState<SoundKey>(readSound)
  const kick = useRef<() => void>(() => {})

  // ปลดล็อกเสียงเมื่อผู้ใช้คลิก/กดปุ่มครั้งแรกในหน้า
  useEffect(() => {
    const unlock = () => { audio(); setNeedClick(false); try { speechSynthesis.getVoices() } catch { /* ไม่มีเสียงพูด */ } } // โหลดรายชื่อเสียงพูดไว้ก่อน (โหลดแบบ async)
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  useEffect(() => {
    let alive = true, timer: number | undefined
    async function tick() {
      try {
        const r = await fetch('/api/vira/pending', { cache: 'no-store' })
        if (r.ok && alive) {
          const j = await r.json() as { count: number; latest: Latest }
          setCount(j.count); setLatest(j.latest)
          const until = readSnooze()
          setSnoozeUntil(until); setSnoozed(Date.now() < until)
          window.dispatchEvent(new CustomEvent(VIRA_PENDING_EVENT, { detail: j.count }))
          if (j.count > 0 && canAccept && Date.now() > readSnooze()) setNeedClick(!play(readSound()))
        }
      } catch { /* เงียบ */ }
      if (alive) timer = window.setTimeout(tick, POLL_MS)
    }
    // กด "รับงาน" แล้วให้เช็คใหม่ทันที (เสียงหยุดเลย ไม่ต้องรอรอบถัดไป)
    kick.current = () => { if (timer) window.clearTimeout(timer); void tick() }
    const onRefresh = () => kick.current()
    window.addEventListener(VIRA_REFRESH_EVENT, onRefresh)
    tick()
    return () => { alive = false; if (timer) window.clearTimeout(timer); window.removeEventListener(VIRA_REFRESH_EVENT, onRefresh) }
  }, [canAccept])

  function snooze() {
    const until = Date.now() + SNOOZE_MS
    try { localStorage.setItem(SNOOZE_KEY, String(until)) } catch { /* ไม่มี storage ก็เลื่อนแค่ในหน้านี้ */ }
    setSnoozeUntil(until); setSnoozed(true)
  }
  function pickSound(k: SoundKey) {
    try { localStorage.setItem(SOUND_KEY, k) } catch { /* ใช้ได้แค่ในหน้านี้ */ }
    setSound(k); play(k) // เล่นให้ฟังทันที
  }

  if (!count || !canAccept) return null
  const onIssues = path.startsWith('/issues')
  return createPortal(
    <div className="fixed bottom-5 left-5 z-[95] w-[300px] max-w-[calc(100vw-40px)] bg-white border-2 border-[#1B5FD9] rounded-2xl shadow-[0_16px_44px_rgba(18,26,40,0.28)] p-3.5"
      role="alert" style={{ animation: snoozed ? undefined : 'vn-pulse 2s ease-in-out infinite' }}>
      <div className="flex items-start gap-2.5">
        <span className="text-[22px] leading-none">📞</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#1C1917]">เรื่องจาก Vira รอรับ {count} เรื่อง</div>
          {latest && <div className="text-[12px] text-[#3C4A5E] mt-0.5 truncate">{[latest.hospitalName, latest.title].filter(Boolean).join(' · ')}</div>}
          {needClick && !snoozed && <div className="text-[11px] text-[#B45309] mt-1">คลิกที่ไหนก็ได้ในหน้าเว็บ 1 ครั้งเพื่อเปิดเสียงแจ้งเตือน</div>}
          {snoozed && <div className="text-[11px] text-[#8492A6] mt-1">🔕 ปิดเสียงถึง {new Date(snoozeUntil).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        {!onIssues && (
          <Link href={latest ? `/issues?open=${latest.id}` : '/issues'} className="flex-1 text-center bg-[#1B5FD9] text-white text-[12.5px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#164FB3]">ไปกดรับงาน</Link>
        )}
        {onIssues && <span className="flex-1 text-[11.5px] text-[#5A6B82]">กด “รับงาน” ที่การ์ดที่มีป้าย 📞 Vira</span>}
        {!snoozed && <button onClick={snooze} className="text-[12px] font-semibold text-[#5A6B82] border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 hover:border-[#1B5FD9]">🔕 15 นาที</button>}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[11.5px] text-[#5A6B82]">
        <label htmlFor="vira-sound">🔊 เสียง</label>
        <select id="vira-sound" value={sound} onChange={(e) => pickSound(e.target.value as SoundKey)}
          className="flex-1 border border-[#DCE4EE] rounded-md px-1.5 py-1 text-[11.5px] bg-white outline-none focus:border-[#1B5FD9]">
          {(Object.keys(VIRA_SOUNDS) as SoundKey[]).map((k) => <option key={k} value={k}>{VIRA_SOUNDS[k]}</option>)}
        </select>
        <button type="button" onClick={() => play(sound)} className="border border-[#DCE4EE] rounded-md px-2 py-1 hover:border-[#1B5FD9]" title="ลองฟัง">▶ ลองฟัง</button>
      </div>
      <style>{`@keyframes vn-pulse{0%,100%{box-shadow:0 16px 44px rgba(18,26,40,.28)}50%{box-shadow:0 0 0 6px rgba(27,95,217,.18),0 16px 44px rgba(18,26,40,.28)}}`}</style>
    </div>, document.body)
}
