'use client'
import { useMemo } from 'react'
import { FAT_METRICS } from '@/lib/fatTest'

export type Ref = { n?: string; s?: number }
export type Reading = { id: string; at: string; device: string | null; name: string | null; idcard: string | null; metrics: Record<string, number>; refs?: Record<string, Ref> }

export const metricLabel = (k: string) => FAT_METRICS.find((m) => m.key === k)?.label || k
export const metricUnit = (k: string) => FAT_METRICS.find((m) => m.key === k)?.unit || ''
export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
export const orderKeys = (keys: string[]) => {
  const order = FAT_METRICS.map((m) => m.key)
  return [...keys].sort((a, b) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)))
}
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short' })
export const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : dateFmt.format(d) }

const statusInfo = (s?: number) =>
  s === 1 ? { t: 'ปกติ', cls: 'text-[#157F4C] bg-[#E7F4EE]', sym: '✓' }
  : s === 0 ? { t: 'ต่ำ', cls: 'text-[#B45309] bg-[#FDECD3]', sym: '↓' }
  : s === 2 ? { t: 'สูง', cls: 'text-[#C13540] bg-[#FBE4E4]', sym: '↑' }
  : null

const ADVICE: Record<string, { high?: string; low?: string }> = {
  bmi: { high: 'น้ำหนักเกินเกณฑ์ — คุมอาหารและออกกำลังกายสม่ำเสมอ', low: 'ผอมเกินเกณฑ์ — เพิ่มพลังงาน/โปรตีนให้เพียงพอ' },
  bodyFat: { high: 'ไขมันในร่างกายสูง — ลดของทอด/น้ำตาล + คาร์ดิโอสม่ำเสมอ', low: 'ไขมันต่ำ — กินไขมันดี/โปรตีนให้พอ' },
  visceralFat: { high: 'ไขมันช่องท้องสูง — เสี่ยงเบาหวาน/หัวใจ ลดน้ำตาล-แป้งขัดสี + ออกกำลังกาย' },
  subcutFat: { high: 'ไขมันใต้ผิวหนังสูง — คุมแคลอรีรวม + ออกกำลังกาย' },
  muscleRate: { low: 'สัดส่วนกล้ามเนื้อน้อย — เพิ่มโปรตีน + เวทเทรนนิ่ง' },
  muscle: { low: 'มวลกล้ามเนื้อน้อย — เพิ่มโปรตีน + ออกกำลังกายแบบมีแรงต้าน' },
  water: { low: 'น้ำในร่างกายต่ำ — ดื่มน้ำให้เพียงพอ' },
  protein: { low: 'โปรตีนต่ำ — เพิ่มอาหารโปรตีน' },
  boneMass: { low: 'มวลกระดูกน้อย — แคลเซียม/วิตามินD + ออกกำลังกายลงน้ำหนัก' },
  metabolicAge: { high: 'อายุร่างกายมากกว่าจริง — เพิ่มกล้ามเนื้อ/ออกกำลังกาย' },
  obesity: { high: 'เกินมาตรฐานน้ำหนัก — ตั้งเป้าลดน้ำหนักอย่างค่อยเป็นค่อยไป' },
  whr: { high: 'สัดส่วนเอว/สะโพกสูง (ลงพุง) — เสี่ยงเมตาบอลิก ควบคุมอาหาร+ออกกำลังกาย' },
}

const parseBand = (n?: string): [number, number] | null => {
  if (!n) return null
  const m = n.match(/(-?\d+(?:\.\d+)?)\s*[-~]\s*(-?\d+(?:\.\d+)?)/)
  if (!m) return null
  const lo = Number(m[1]), hi = Number(m[2])
  return isFinite(lo) && isFinite(hi) ? [Math.min(lo, hi), Math.max(lo, hi)] : null
}

type Session = { at: string; last: string; device: string | null; metrics: Record<string, number>; refs: Record<string, Ref>; count: number }
// เครื่อง Shanghe แยก 1 การวัดเป็น 2 เรคคอร์ด (พื้นฐาน + องค์ประกอบเต็ม) → รวมถ้าห่างกัน ≤ 2 นาที
export function toSessions(rows: Reading[]): Session[] {
  const GAP = 120_000
  const out: Session[] = []
  for (const r of rows) {
    const prev = out[out.length - 1]
    if (prev && new Date(r.at).getTime() - new Date(prev.last).getTime() <= GAP) {
      for (const [k, v] of Object.entries(r.metrics || {})) prev.metrics[k] = v
      for (const [k, v] of Object.entries(r.refs || {})) prev.refs[k] = v
      prev.at = r.at; prev.last = r.at; prev.device = prev.device || r.device; prev.count++
    } else {
      out.push({ at: r.at, last: r.at, device: r.device, metrics: { ...(r.metrics || {}) }, refs: { ...(r.refs || {}) }, count: 1 })
    }
  }
  return out
}

// เนื้อหารายงาน (ใช้ร่วมกันทั้งหน้าเจ้าหน้าที่และหน้าสาธารณะ) — id="fatreport" ไว้ให้ปริ้น/export
export function FatReportBody({ person, rows }: { person: string; rows: Reading[] }) {
  const sessions = useMemo(() => toSessions(rows.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())), [rows])
  const latest = sessions[sessions.length - 1]
  const latestKeys = latest ? orderKeys(Object.keys(latest.metrics || {})) : []
  const trendKeys = useMemo(() => {
    const all = new Set<string>()
    for (const s of sessions) for (const k of Object.keys(s.metrics || {})) all.add(k)
    return orderKeys(Array.from(all)).filter((k) => sessions.filter((s) => s.metrics?.[k] != null).length >= 2)
  }, [sessions])
  const outOfRange = latest ? latestKeys.filter((k) => latest.refs?.[k]?.s != null && latest.refs![k].s !== 1) : []

  if (!latest) return <div className="text-center text-[#8492A6] py-10">ยังไม่มีข้อมูลการวัดของ “{person}”</div>

  return (
    <div id="fatreport" className="bg-white border border-[#E7EDF4] rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 border-b border-[#EEF2F8] pb-4 flex-wrap">
        <div>
          <div className="text-[18px] font-bold text-[#1C2A3E]">รายงานผลวัดองค์ประกอบร่างกาย</div>
          <div className="text-[13px] text-[#5A6B82] mt-1">ผู้วัด: <b className="text-[#233047]">{person}</b> · วัดทั้งหมด {sessions.length} ครั้ง</div>
          <div className="text-[12px] text-[#8492A6] mt-0.5">ผลล่าสุด: {fmt(latest.at)} · เครื่อง {latest.device || '—'}</div>
        </div>
        <div className="text-right text-[11.5px] text-[#8492A6]">BMS Smart Hospital<br />พิมพ์เมื่อ {fmt(new Date().toISOString())}</div>
      </div>

      <div className="print-avoid-break">
        <div className="text-[13px] font-bold text-[#233047] mb-2">ผลล่าสุด</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {latestKeys.map((k) => {
            const st = statusInfo(latest.refs?.[k]?.s)
            return (
              <div key={k} className="rounded-lg border border-[#EEF2F8] bg-[#FAFBFD] p-2.5 text-center print-avoid-break">
                <div className="text-[11px] text-[#8492A6] leading-tight min-h-[26px] flex items-center justify-center">{metricLabel(k)}</div>
                <div className="text-[20px] font-bold text-[#1C1917] tnum leading-none mt-0.5">{fmtNum(latest.metrics[k])}<span className="text-[10px] font-normal text-[#A8A29E] ml-0.5">{metricUnit(k)}</span></div>
                {latest.refs?.[k]?.n && <div className="text-[9.5px] text-[#96A2B5] mt-1">เกณฑ์ {latest.refs[k].n}</div>}
                {st && <div className={`inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5 mt-1 ${st.cls}`}>{st.sym} {st.t}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="print-avoid-break">
        <div className="text-[13px] font-bold text-[#233047] mb-2">วิเคราะห์ & คำแนะนำ</div>
        {outOfRange.length === 0 ? (
          <div className="text-[12.5px] font-semibold text-[#157F4C] bg-[#E7F4EE] rounded-lg px-3 py-2.5">👍 ค่าที่ประเมินได้อยู่ในเกณฑ์ปกติทั้งหมด — รักษาพฤติกรรมสุขภาพนี้ไว้</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {outOfRange.map((k) => {
              const dir = latest.refs![k].s === 2 ? 'high' : 'low'
              const tip = ADVICE[k]?.[dir] || (dir === 'high' ? 'สูงกว่าเกณฑ์ ควรปรับพฤติกรรม' : 'ต่ำกว่าเกณฑ์ ควรดูแลเพิ่ม')
              return (
                <div key={k} className="flex items-start gap-2 text-[12px] bg-[#FFF9F0] border border-[#F3E4CC] rounded-lg px-3 py-1.5">
                  <span className={`shrink-0 font-semibold rounded-full px-1.5 py-0.5 text-[10px] ${dir === 'high' ? 'text-[#C13540] bg-[#FBE4E4]' : 'text-[#B45309] bg-[#FDECD3]'}`}>{dir === 'high' ? '↑ สูง' : '↓ ต่ำ'}</span>
                  <span className="text-[#3C4A5E]"><b className="text-[#233047]">{metricLabel(k)}:</b> {tip}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {trendKeys.length > 0 && (
        <div className="print-avoid-break">
          <div className="text-[13px] font-bold text-[#233047] mb-2">แนวโน้ม (เทียบรอบก่อนๆ)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trendKeys.map((k) => {
              const pts = sessions.filter((s) => s.metrics?.[k] != null).map((s) => ({ t: s.at, v: s.metrics[k] }))
              const band = parseBand(latest.refs?.[k]?.n)
              return <MiniTrend key={k} label={metricLabel(k)} unit={metricUnit(k)} points={pts} band={band} />
            })}
          </div>
        </div>
      )}
      {trendKeys.length === 0 && (
        <div className="text-[12px] text-[#8492A6] bg-[#F6F8FB] rounded-lg px-3 py-2">
          {sessions.length < 2 ? 'วัดครั้งเดียว — ยังไม่มีแนวโน้ม (วัดเพิ่มอีกรอบเพื่อดูกราฟเปรียบเทียบ)' : 'ยังไม่มีค่าที่วัดซ้ำ ≥ 2 ครั้งพอจะทำกราฟ'}
        </div>
      )}

      <div className="print-avoid-break">
        <div className="text-[13px] font-bold text-[#233047] mb-2">ประวัติการวัด ({sessions.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead><tr className="text-[10.5px] text-[#8492A6] bg-[#FAFBFD]">
              <th className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">วันที่</th>
              {orderKeys(latestKeys).map((k) => <th key={k} className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">{metricLabel(k)}</th>)}
            </tr></thead>
            <tbody>
              {sessions.slice().reverse().map((s, i) => (
                <tr key={s.at + i} className="border-t border-[#F1F4F8]">
                  <td className="px-2 py-1.5 text-[#5A6B82] whitespace-nowrap tnum">{fmt(s.at)}</td>
                  {orderKeys(latestKeys).map((k) => <td key={k} className="px-2 py-1.5 text-right tnum">{s.metrics?.[k] != null ? fmtNum(s.metrics[k]) : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-[#A8A29E] border-t border-[#EEF2F8] pt-2">เกณฑ์อ้างอิงจากเครื่องวัด (คำนวณตามเพศ/อายุ/ส่วนสูงของผู้วัด) · คำแนะนำเป็นข้อมูลสุขภาพทั่วไป ไม่ใช่การวินิจฉัยทางการแพทย์</p>
    </div>
  )
}

// CSS สำหรับปริ้น (ให้ #fatreport เต็มหน้า A4 + ซ่อนเมนู) — วางในหน้า wrapper ที่มี id="fatreport-wrap"
export const FAT_PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #fatreport-wrap, #fatreport-wrap * { visibility: visible !important; }
  #fatreport-wrap { position: static !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
  #fatreport { box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; }
  .no-print, .no-print * { visibility: hidden !important; display: none !important; }
  header, footer { display: none !important; }
  .print-avoid-break { break-inside: avoid; }
  @page { size: A4; margin: 10mm; }
}`

function MiniTrend({ label, unit, points, band }: { label: string; unit: string; points: { t: string; v: number }[]; band: [number, number] | null }) {
  const W = 300, H = 110, padT = 8, padB = 20, padL = 34, padR = 8
  const vals = points.map((p) => p.v)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (band) { lo = Math.min(lo, band[0]); hi = Math.max(hi, band[1]) }
  if (lo === hi) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad
  const rng = hi - lo || 1
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i / (points.length - 1)) * (W - padL - padR))
  const y = (v: number) => padT + (1 - (v - lo) / rng) * (H - padT - padB)
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')
  const first = points[0], last = points[points.length - 1]
  const delta = last.v - first.v
  return (
    <div className="rounded-lg border border-[#EEF2F8] bg-white p-2 print-avoid-break">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[11.5px] font-semibold text-[#233047]">{label} <span className="text-[10px] font-normal text-[#A8A29E]">{unit}</span></div>
        {points.length >= 2 && (
          <div className={`text-[10.5px] font-semibold ${Math.abs(delta) < 0.05 ? 'text-[#8492A6]' : delta > 0 ? 'text-[#C13540]' : 'text-[#157F4C]'}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {delta > 0 ? '+' : ''}{fmtNum(delta)}
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 128, display: 'block' }}>
        {band && <rect x={padL} y={y(band[1])} width={W - padL - padR} height={Math.max(0, y(band[0]) - y(band[1]))} fill="#E7F4EE" />}
        {band && <line x1={padL} y1={y(band[1])} x2={W - padR} y2={y(band[1])} stroke="#BFE3CE" strokeWidth="0.8" strokeDasharray="3 3" />}
        {band && <line x1={padL} y1={y(band[0])} x2={W - padR} y2={y(band[0])} stroke="#BFE3CE" strokeWidth="0.8" strokeDasharray="3 3" />}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#E7EDF4" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#E7EDF4" strokeWidth="1" />
        <text x={padL - 4} y={y(hi) + 3} textAnchor="end" fontSize="8" fill="#A8A29E">{fmtNum(hi)}</text>
        <text x={padL - 4} y={y(lo) + 3} textAnchor="end" fontSize="8" fill="#A8A29E">{fmtNum(lo)}</text>
        <polyline points={line} fill="none" stroke="#1B5FD9" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r={i === points.length - 1 ? 3 : 2} fill={i === points.length - 1 ? '#C13540' : '#1B5FD9'} />)}
        <text x={x(points.length - 1)} y={y(last.v) - 6} textAnchor="end" fontSize="9" fontWeight="bold" fill="#C13540">{fmtNum(last.v)}</text>
        <text x={padL} y={H - 6} textAnchor="start" fontSize="8" fill="#A8A29E">{dFmt.format(new Date(first.t))}</text>
        {points.length >= 2 && <text x={W - padR} y={H - 6} textAnchor="end" fontSize="8" fill="#A8A29E">{dFmt.format(new Date(last.t))}</text>}
      </svg>
    </div>
  )
}
