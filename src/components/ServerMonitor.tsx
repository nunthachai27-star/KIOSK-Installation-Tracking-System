'use client'
import { useEffect, useState } from 'react'

type Stats = {
  at: string; cores: number; load1: number; load5: number; load15: number
  memTotal: number; memAvailable: number; memUsed: number; swapTotal: number; swapUsed: number
  deploy: 'ok' | 'caution' | 'avoid'
}

const DEPLOY_META = {
  ok: { label: 'พร้อม deploy ได้', color: '#157F4C', bg: '#EAF7EF', icon: '🟢' },
  caution: { label: 'ระวัง — รอสักครู่ดีกว่า', color: '#B45309', bg: '#FBF3E2', icon: '🟡' },
  avoid: { label: 'อย่าเพิ่ง deploy — เครื่องแน่น', color: '#B0272F', bg: '#FBE9E9', icon: '🔴' },
} as const

const gb = (mb: number) => (mb / 1024).toFixed(1)

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-[#EEF1F5] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  )
}

export function ServerMonitor() {
  const [s, setS] = useState<Stats | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const r = await fetch('/api/monitor/server', { cache: 'no-store' })
        if (!r.ok) { if (alive) setErr('โหลดข้อมูลไม่ได้'); return }
        const d = await r.json() as Stats
        if (alive) { setS(d); setErr('') }
      } catch { if (alive) setErr('เชื่อมต่อไม่ได้') }
    }
    poll()
    const iv = setInterval(poll, 4000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  if (err && !s) return <div className="ds-card p-5 text-[13px] text-[#B0272F]">{err}</div>
  if (!s) return <div className="ds-card p-5 text-[13px] text-[#8492A6]">กำลังโหลด…</div>

  const dm = DEPLOY_META[s.deploy]
  const loadColor = s.load1 >= 6 ? '#B0272F' : s.load1 >= 3 ? '#B45309' : '#157F4C'
  const memPct = s.memTotal ? (s.memUsed / s.memTotal) * 100 : 0
  const memColor = s.memAvailable < 500 ? '#B0272F' : s.memAvailable < 1000 ? '#B45309' : '#157F4C'
  const swapPct = s.swapTotal ? (s.swapUsed / s.swapTotal) * 100 : 0
  // load เทียบกับจำนวน core (load = cores ≈ เต็มพอดี)
  const loadPct = s.cores ? (s.load1 / s.cores) * 100 : s.load1 * 12

  return (
    <div className="flex flex-col gap-4">
      {/* สรุป deploy ได้ไหม */}
      <div className="rounded-2xl px-5 py-4 border flex items-center gap-3" style={{ background: dm.bg, borderColor: `${dm.color}33` }}>
        <span className="text-[26px]">{dm.icon}</span>
        <div>
          <div className="text-[16px] font-bold" style={{ color: dm.color }}>{dm.label}</div>
          <div className="text-[12px] text-[#5A6B82] mt-0.5">ประเมินจาก load 1 นาที + แรมว่าง · อัปเดตทุก 4 วิ</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {/* Load */}
        <div className="ds-card p-4">
          <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1">Load average (1 นาที)</div>
          <div className="text-[30px] font-bold tnum" style={{ color: loadColor }}>{s.load1.toFixed(2)}</div>
          <div className="text-[11.5px] text-[#8492A6] mb-2">{s.cores ? `${s.cores} core · ปกติควร < ${s.cores}` : 'ปกติควรต่ำ'} · 5m {s.load5.toFixed(1)} · 15m {s.load15.toFixed(1)}</div>
          <Bar pct={loadPct} color={loadColor} />
        </div>

        {/* RAM */}
        <div className="ds-card p-4">
          <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1">แรม (RAM)</div>
          <div className="text-[30px] font-bold tnum" style={{ color: memColor }}>{gb(s.memAvailable)}<span className="text-[15px] font-semibold text-[#8492A6]"> GB ว่าง</span></div>
          <div className="text-[11.5px] text-[#8492A6] mb-2">ใช้ {gb(s.memUsed)} / {gb(s.memTotal)} GB</div>
          <Bar pct={memPct} color={memColor} />
        </div>

        {/* Swap */}
        <div className="ds-card p-4">
          <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1">Swap</div>
          <div className="text-[30px] font-bold tnum" style={{ color: swapPct > 90 ? '#B0272F' : '#5A6B82' }}>{Math.round(swapPct)}<span className="text-[15px] font-semibold text-[#8492A6]">%</span></div>
          <div className="text-[11.5px] text-[#8492A6] mb-2">ใช้ {gb(s.swapUsed)} / {gb(s.swapTotal)} GB</div>
          <Bar pct={swapPct} color={swapPct > 90 ? '#B0272F' : '#96A2B5'} />
        </div>
      </div>

      <p className="text-[12px] text-[#8492A6]">
        แนะนำ deploy เมื่อไฟ <b>🟢 เขียว</b> (load 1 นาที ต่ำกว่า ~3 และแรมว่าง &gt; 1GB) · เครื่องนี้รันหลายแอปรวมกัน แรม/CPU จึงกระเพื่อมเป็นช่วงๆ
      </p>
    </div>
  )
}
