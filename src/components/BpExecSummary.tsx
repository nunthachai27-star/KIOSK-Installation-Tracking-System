'use client'
import { useEffect, useState } from 'react'

type Agg = { n: number; bias: number | null; mad: number | null; within5: number; within10: number; over10: number; maxAbs: number | null }
type Summary = {
  devices: { d1: string | null; d2: string | null }
  perDevice: { d1: number; d2: number }
  totalReadings: number
  peopleCompared: number
  pairRounds: number
  metrics: { systolic: Agg; diastolic: Agg; pulse: Agg }
  updatedAt: string
}
const METRICS: { key: 'systolic' | 'diastolic' | 'pulse'; label: string; unit: string }[] = [
  { key: 'systolic', label: 'SYS (ความดันตัวบน)', unit: 'mmHg' },
  { key: 'diastolic', label: 'DIA (ความดันตัวล่าง)', unit: 'mmHg' },
  { key: 'pulse', label: 'ชีพจร', unit: 'bpm' },
]
const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function BpExecSummary() {
  const [s, setS] = useState<Summary | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const r = await fetch('/api/dev/bp/summary', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json() as Summary
        if (alive) { setS(d); setLoaded(true) }
      } catch { /* เงียบ */ }
    }
    poll()
    const iv = setInterval(poll, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const d1 = s?.devices.d1, d2 = s?.devices.d2

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-8 px-4">
      <div className="max-w-[920px] mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white grid place-items-center text-[24px] shadow-sm">🩺</span>
          <div>
            <h1 className="text-[22px] font-bold text-[#1C2A3E]">สรุปเปรียบเทียบเครื่องวัดความดัน</h1>
            <p className="text-[13px] text-[#5A6B82]">ภาพรวมความสอดคล้องของ 2 เครื่อง · อัปเดตอัตโนมัติ{s ? ` · ${timeFmt.format(new Date(s.updatedAt))}` : ''}</p>
          </div>
        </div>

        {!loaded ? <div className="text-center text-[#8492A6] py-16">กำลังโหลด…</div>
          : !s || s.pairRounds === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#C7D3E2] p-12 text-center text-[#8492A6]">
              ยังไม่มีคู่การวัดที่เทียบได้<br /><span className="text-[12px]">ต้องมีการวัดคนเดียวกันทั้ง 2 เครื่อง (วัดเครื่องหนึ่งแล้ววัดอีกเครื่องต่อภายใน 15 นาที)</span>
            </div>
          ) : (
          <>
            {/* เครื่องที่เทียบ */}
            <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-4 flex items-center justify-center gap-3 flex-wrap text-center">
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-[#1B5FD9]" /><b className="text-[#233047] text-[14px] break-all">{d1}</b><span className="text-[11px] text-[#8492A6]">({s.perDevice.d1})</span></div>
              <span className="text-[#B4BCC8] font-bold">เทียบกับ</span>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-[#C13540]" /><b className="text-[#233047] text-[14px] break-all">{d2}</b><span className="text-[11px] text-[#8492A6]">({s.perDevice.d2})</span></div>
            </div>

            {/* ตัวเลขรวม */}
            <div className="grid grid-cols-3 gap-3">
              <Tile label="การวัดทั้งหมด" value={s.totalReadings} unit="ครั้ง" />
              <Tile label="คู่ที่เทียบได้" value={s.pairRounds} unit="รอบ" />
              <Tile label="ผู้เข้าวัด (ที่เทียบ)" value={s.peopleCompared} unit="คน" />
            </div>

            {/* ผลต่างต่อค่า */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METRICS.map((m) => <MetricCard key={m.key} m={m} a={s.metrics[m.key]} d1={d1!} d2={d2!} />)}
            </div>

            <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-4">
              <div className="text-[13px] font-bold text-[#233047] mb-1">อ่านผลอย่างไร</div>
              <ul className="text-[12.5px] text-[#5A6B82] leading-relaxed list-disc pl-5">
                <li><b>ผลต่างเฉลี่ย (bias):</b> โดยเฉลี่ย {d1} อ่านค่า สูง/ต่ำ กว่า {d2} เท่าไหร่ — ใกล้ 0 = สองเครื่องให้ค่าใกล้เคียงกัน</li>
                <li><b>ค่าต่างเฉลี่ยสัมบูรณ์:</b> ขนาดความต่างเฉลี่ยต่อครั้ง (ไม่สนทิศทาง)</li>
                <li><b>แถบความสอดคล้อง:</b> เขียว = ต่าง ≤5 · เหลือง = 6–10 · แดง = &gt;10</li>
              </ul>
            </div>
            <div className="text-center text-[11.5px] text-[#A8A29E]">BMS Smart Hospital · ข้อมูลสรุปเชิงเปรียบเทียบอุปกรณ์ · ไม่ใช่การวินิจฉัยทางการแพทย์</div>
          </>
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-4 text-center">
      <div className="text-[12px] text-[#8492A6] mb-1">{label}</div>
      <div className="text-[30px] font-bold text-[#1C2A3E] leading-none tnum">{value}</div>
      <div className="text-[11px] text-[#A8A29E] mt-1">{unit}</div>
    </div>
  )
}

function MetricCard({ m, a, d1, d2 }: { m: { label: string; unit: string }; a: Agg; d1: string; d2: string }) {
  if (a.n === 0) return (
    <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-4">
      <div className="text-[13px] font-bold text-[#233047]">{m.label}</div>
      <div className="text-[12px] text-[#A8A29E] mt-2">ยังไม่มีข้อมูลเทียบ</div>
    </div>
  )
  const total = a.within5 + a.within10 + a.over10
  const pct = (x: number) => total ? Math.round((x / total) * 100) : 0
  const bias = a.bias ?? 0
  const biasTxt = Math.abs(bias) < 0.05 ? `ใกล้เคียงกัน` : `${d1} ${bias > 0 ? 'สูงกว่า' : 'ต่ำกว่า'} ${Math.abs(bias)}`
  const biasColor = Math.abs(bias) <= 3 ? '#157F4C' : Math.abs(bias) <= 6 ? '#B45309' : '#C13540'
  return (
    <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-4 flex flex-col gap-2.5">
      <div className="text-[13px] font-bold text-[#233047]">{m.label} <span className="text-[11px] font-normal text-[#A8A29E]">{m.unit}</span></div>
      <div>
        <div className="text-[11px] text-[#8492A6]">ผลต่างเฉลี่ย (bias)</div>
        <div className="text-[24px] font-bold leading-none tnum" style={{ color: biasColor }}>{bias > 0 ? '+' : ''}{a.bias}</div>
        <div className="text-[11px] text-[#5A6B82] mt-0.5">{biasTxt}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] text-[#8492A6]">ค่าต่างเฉลี่ย</span>
        <span className="text-[15px] font-bold text-[#233047] tnum">{a.mad}</span>
        <span className="text-[11px] text-[#A8A29E]">· สูงสุด {a.maxAbs}</span>
      </div>
      <div>
        <div className="flex h-3 rounded-full overflow-hidden border border-[#EEF2F8]">
          {a.within5 > 0 && <div style={{ width: `${pct(a.within5)}%`, background: '#3FB27F' }} />}
          {a.within10 > 0 && <div style={{ width: `${pct(a.within10)}%`, background: '#E8A33D' }} />}
          {a.over10 > 0 && <div style={{ width: `${pct(a.over10)}%`, background: '#D9534F' }} />}
        </div>
        <div className="flex justify-between text-[10.5px] mt-1">
          <span className="text-[#157F4C]">≤5: {a.within5} ({pct(a.within5)}%)</span>
          <span className="text-[#B45309]">6–10: {a.within10}</span>
          <span className="text-[#C13540]">&gt;10: {a.over10}</span>
        </div>
      </div>
    </div>
  )
}
