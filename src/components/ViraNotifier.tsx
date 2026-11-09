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

// เสียงกริ่งโทรศัพท์สั้น ๆ 2 ชุด (ดังกว่าเสียงผู้สนใจโปรดัก ให้แยกออก)
function ring() {
  const c = audio()
  if (!c || c.state !== 'running') return false
  const notes = [988, 784, 988, 784]
  notes.forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain()
    o.type = 'triangle'; o.frequency.value = f
    o.connect(g); g.connect(c.destination)
    const t = c.currentTime + i * 0.2 + (i >= 2 ? 0.35 : 0)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.start(t); o.stop(t + 0.2)
  })
  return true
}

const readSnooze = () => { try { return Number(localStorage.getItem(SNOOZE_KEY)) || 0 } catch { return 0 } }

export function ViraNotifier({ canAccept }: { canAccept: boolean }) {
  const path = usePathname()
  const [count, setCount] = useState(0)
  const [latest, setLatest] = useState<Latest>(null)
  const [snoozeUntil, setSnoozeUntil] = useState(readSnooze)
  const [snoozed, setSnoozed] = useState(false)
  const [needClick, setNeedClick] = useState(false)
  const kick = useRef<() => void>(() => {})

  // ปลดล็อกเสียงเมื่อผู้ใช้คลิก/กดปุ่มครั้งแรกในหน้า
  useEffect(() => {
    const unlock = () => { audio(); setNeedClick(false) }
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
          if (j.count > 0 && canAccept && Date.now() > readSnooze()) setNeedClick(!ring())
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
      <style>{`@keyframes vn-pulse{0%,100%{box-shadow:0 16px 44px rgba(18,26,40,.28)}50%{box-shadow:0 0 0 6px rgba(27,95,217,.18),0 16px 44px rgba(18,26,40,.28)}}`}</style>
    </div>, document.body)
}
