'use client'
import { useEffect, useMemo, useState } from 'react'
import { confirmDialog } from '@/lib/dialog'
import { downloadNodePng, downloadNodePdf } from '@/lib/exportReport'

type Reading = { id: string; at: string; device: string | null; name: string | null; idcard: string | null; systolic: number | null; diastolic: number | null; pulse: number | null }
type Metric = { key: 'systolic' | 'diastolic' | 'pulse'; label: string; unit: string }
const METRICS: Metric[] = [
  { key: 'systolic', label: 'SYS (ตัวบน)', unit: 'mmHg' },
  { key: 'diastolic', label: 'DIA (ตัวล่าง)', unit: 'mmHg' },
  { key: 'pulse', label: 'ชีพจร', unit: 'bpm' },
]
const DEV_COLORS = ['#1B5FD9', '#C13540', '#157F4C', '#7A44C6']
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : dateFmt.format(d) }

// แปลผลความดัน (เกณฑ์ทั่วไปผู้ใหญ่ AHA) — ไม่ใช่การวินิจฉัยทางการแพทย์
function bpCategory(sys: number | null, dia: number | null): { t: string; cls: string } | null {
  if (sys == null || dia == null) return null
  if (sys >= 180 || dia >= 120) return { t: 'สูงวิกฤต', cls: 'text-white bg-[#991B1B]' }
  if (sys >= 140 || dia >= 90) return { t: 'สูงระดับ 2', cls: 'text-[#C13540] bg-[#FBE4E4]' }
  if (sys >= 130 || dia >= 80) return { t: 'สูงระดับ 1', cls: 'text-[#B45309] bg-[#FDECD3]' }
  if (sys >= 120) return { t: 'เริ่มสูง', cls: 'text-[#B45309] bg-[#FDECD3]' }
  return { t: 'ปกติ', cls: 'text-[#157F4C] bg-[#E7F4EE]' }
}

export function BpPersonReport({ canDelete }: { canDelete?: boolean }) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loaded, setLoaded] = useState(false)
  const [person, setPerson] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    try {
      const r = await fetch('/api/dev/bp', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json() as { readings: Reading[] }
      setReadings(d.readings || []); setLoaded(true)
    } catch { /* เงียบ */ }
  }
  useEffect(() => { load() }, [])

  // '__ALL__' = เทียบทุกเครื่องตามลำดับเวลา (ไม่แยกชื่อ)
  const ALL = '__ALL__'
  const personLabel = (p: string) => p === ALL ? 'ทุกคน (เทียบตามเวลา ไม่แยกชื่อ)' : p

  // เติมชื่อผู้วัดให้เรคคอร์ดที่ไม่มีชื่อ (เช่น Yuwell) จากเรคคอร์ดก่อนหน้าที่มีชื่อ (เช่น 1F64)
  // ภายใน 15 นาที — เพื่อจับเป็น "คนเดียวกัน" แล้วเทียบข้ามเครื่องได้ (คำนวณตอนแสดง ไม่แก้ข้อมูลจริง)
  const NAME_WINDOW = 15 * 60 * 1000
  const effRows = useMemo(() => {
    const sorted = readings.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    let last: { name: string; t: number } | null = null
    return sorted.map((r) => {
      const raw = (r.name || '').trim()
      const t = new Date(r.at).getTime()
      let eff = raw
      if (raw) last = { name: raw, t }
      else if (last && t - last.t <= NAME_WINDOW) eff = last.name
      return { ...r, effName: eff || 'ไม่ระบุผู้วัด', inherited: !raw && !!eff }
    })
  }, [readings])

  const persons = useMemo(() => [ALL, ...Array.from(new Set(effRows.map((r) => r.effName)))], [effRows])
  useEffect(() => { if (!person && effRows.length) setPerson(effRows[effRows.length - 1].effName) }, [effRows, person])

  const rows = useMemo(() => effRows.filter((r) => person === ALL || r.effName === person), [effRows, person])
  const hasInherited = rows.some((r) => r.inherited)

  // เครื่องที่คนนี้เคยวัด (เรียงตามจำนวนครั้งมาก→น้อย)
  const devices = useMemo(() => {
    const c = new Map<string, number>()
    for (const r of rows) { const d = r.device || 'ไม่ระบุเครื่อง'; c.set(d, (c.get(d) || 0) + 1) }
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).map(([d]) => d)
  }, [rows])
  const byDevice = (dev: string) => rows.filter((r) => (r.device || 'ไม่ระบุเครื่อง') === dev)
  const latestOf = (dev: string) => { const a = byDevice(dev); return a[a.length - 1] } // rows เรียงเก่า→ใหม่ → ตัวท้าย = ล่าสุด

  async function deletePerson() {
    if (!person) return
    if (!(await confirmDialog({ title: 'ลบข้อมูลผู้วัด', message: `ลบผลวัดความดันทั้งหมดของ "${person}"? ย้อนกลับไม่ได้`, danger: true, confirmText: 'ลบข้อมูล' }))) return
    const r = await fetch(`/api/dev/bp?name=${encodeURIComponent(person)}`, { method: 'DELETE' })
    if (r.ok) { setPerson(''); await load() } else alert('ลบไม่สำเร็จ (เฉพาะ super admin)')
  }
  const safeName = (person || 'bp-report').replace(/[\\/:*?"<>|]+/g, '_')
  async function dl(kind: 'png' | 'pdf') {
    setBusy(kind)
    try { kind === 'png' ? await downloadNodePng('bpreport', `รายงานความดัน-${safeName}`) : await downloadNodePdf('bpreport', `รายงานความดัน-${safeName}`) }
    catch { alert('บันทึกไม่สำเร็จ ลองใหม่') } finally { setBusy('') }
  }

  // จับคู่รายรอบ 2 เครื่องแรก (วัดตามลำดับ → เทียบทีละรอบ)
  const d1 = devices[0], d2 = devices[1]
  const pairRows = useMemo(() => {
    if (!d1 || !d2) return []
    const a = byDevice(d1), b = byDevice(d2)
    const n = Math.min(a.length, b.length)
    return Array.from({ length: n }, (_, i) => ({ i: i + 1, a: a[i], b: b[i] }))
  }, [rows, d1, d2])

  return (
    <div id="bpreport-wrap" className="p-4 sm:p-6 max-w-[920px] mx-auto flex flex-col gap-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #bpreport-wrap, #bpreport-wrap * { visibility: visible !important; }
        #bpreport-wrap { position: static !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        #bpreport { box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; }
        .no-print, .no-print * { visibility: hidden !important; display: none !important; }
        header, footer { display: none !important; }
        .print-avoid-break { break-inside: avoid; }
        @page { size: A4; margin: 10mm; }
      }`}</style>

      <div className="no-print flex items-center gap-2 flex-wrap">
        <a href="/dev/bp-test" className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← กลับเดชบอร์ด</a>
        <div className="flex-1" />
        <label className="text-[13px] text-[#5A6B82] font-semibold">ผู้วัด:</label>
        <select value={person} onChange={(e) => setPerson(e.target.value)} className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[var(--brand)] bg-white">
          {persons.map((p) => <option key={p} value={p}>{personLabel(p)}</option>)}
        </select>
        <button onClick={load} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">↻ รีเฟรช</button>
        <button onClick={() => dl('png')} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'png' ? 'กำลังบันทึก…' : '🖼️ PNG'}</button>
        <button onClick={() => dl('pdf')} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'pdf' ? 'กำลังสร้าง…' : '📄 PDF'}</button>
        <button onClick={() => window.print()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">🖨️ ปริ้น</button>
        {canDelete && person && person !== ALL && <button onClick={deletePerson} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#C13540] hover:border-[#C13540]">🗑️ ลบคนนี้</button>}
      </div>

      {!loaded ? <div className="text-center text-[#8492A6] py-10">กำลังโหลด…</div>
        : readings.length === 0 ? <div className="text-center text-[#8492A6] py-10">ยังไม่มีข้อมูลการวัด</div>
        : rows.length === 0 ? <div className="text-center text-[#8492A6] py-10">ยังไม่มีข้อมูลของ “{person}”</div>
        : (
        <div id="bpreport" className="bg-white border border-[#E7EDF4] rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#EEF2F8] pb-4 flex-wrap">
            <div>
              <div className="text-[18px] font-bold text-[#1C2A3E]">รายงานผลวัดความดัน (เทียบเครื่อง)</div>
              <div className="text-[13px] text-[#5A6B82] mt-1">ผู้วัด: <b className="text-[#233047]">{personLabel(person)}</b> · วัด {rows.length} ครั้ง · {devices.length} เครื่อง</div>
              <div className="text-[12px] text-[#8492A6] mt-0.5">ล่าสุด: {fmt(rows[rows.length - 1].at)}</div>
              {hasInherited && person !== ALL && <div className="text-[11.5px] text-[#7A44C6] mt-1">* ผลของเครื่องที่ไม่ส่งชื่อ (เช่น Yuwell) ถูกจับเป็นผู้วัดคนนี้ โดยยืมชื่อจากการวัดก่อนหน้าภายใน 15 นาที</div>}
            </div>
            <div className="text-right text-[11.5px] text-[#8492A6]">BMS Smart Hospital<br />พิมพ์เมื่อ {fmt(new Date().toISOString())}</div>
          </div>

          {/* เปรียบเทียบค่าล่าสุดของแต่ละเครื่อง */}
          <div className="print-avoid-break">
            <div className="text-[13px] font-bold text-[#233047] mb-2">เปรียบเทียบเครื่อง (ค่าล่าสุดของแต่ละเครื่อง)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-[11px] text-[#8492A6] bg-[#FAFBFD]">
                  <th className="text-left px-3 py-2 font-semibold">ค่า</th>
                  {devices.map((d, i) => {
                    const l = latestOf(d)
                    return (
                      <th key={d} className="text-right px-3 py-2 font-semibold">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: DEV_COLORS[i % DEV_COLORS.length] }} />
                        <span className="align-middle break-all">{d}</span>
                        <div className="text-[10px] font-normal text-[#A8A29E] normal-case">{l ? `วัดล่าสุด ${fmt(l.at)}` : '—'}</div>
                      </th>
                    )
                  })}
                  {devices.length >= 2 && <th className="text-center px-3 py-2 font-semibold">ส่วนต่าง</th>}
                </tr></thead>
                <tbody>
                  {METRICS.map((m) => {
                    const vals = devices.map((d) => latestOf(d)?.[m.key] ?? null)
                    const nums = vals.filter((v): v is number => v != null)
                    const spread = nums.length >= 2 ? Math.max(...nums) - Math.min(...nums) : null
                    return (
                      <tr key={m.key} className="border-t border-[#F1F4F8]">
                        <td className="px-3 py-2.5 font-semibold text-[#1C1917]">{m.label} <span className="text-[11px] font-normal text-[#A8A29E]">{m.unit}</span></td>
                        {vals.map((v, i) => <td key={i} className="px-3 py-2.5 text-right tnum font-bold text-[15px]">{v ?? '—'}</td>)}
                        {devices.length >= 2 && <td className="px-3 py-2.5 text-center">{spread == null ? '—' : spread === 0 ? <span className="text-[12px] font-semibold text-[#157F4C] bg-[#E7F4EE] rounded-full px-2.5 py-0.5">ตรงกัน</span> : <span className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 ${spread <= 5 ? 'text-[#B45309] bg-[#FDECD3]' : 'text-[#C13540] bg-[#FBE4E4]'}`}>ต่าง {spread}</span>}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#8492A6] mt-1.5">ใช้ผลวัด “ล่าสุด” ของแต่ละเครื่อง · ส่วนต่าง: เขียว = ตรงกัน, เหลือง = ใกล้กัน (≤5), แดง = ต่างมาก · วัด 2 เครื่องในเวลาใกล้กันจะเทียบได้ตรงที่สุด</p>
          </div>

          {/* เทียบรายรอบ (วัดตามลำดับ) */}
          {pairRows.length > 0 && (
            <div className="print-avoid-break">
              <div className="text-[13px] font-bold text-[#233047] mb-2">เทียบรายรอบ (วัดตามลำดับ)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-[10.5px] text-[#8492A6] bg-[#FAFBFD]">
                      <th rowSpan={2} className="text-left px-2 py-1.5 font-semibold align-bottom">รอบ</th>
                      <th colSpan={3} className="text-center px-2 py-1 font-semibold border-l border-[#EEF2F8]" style={{ color: DEV_COLORS[0] }}>{d1}</th>
                      <th colSpan={3} className="text-center px-2 py-1 font-semibold border-l border-[#EEF2F8]" style={{ color: DEV_COLORS[1] }}>{d2}</th>
                      <th colSpan={3} className="text-center px-2 py-1 font-semibold border-l border-[#EEF2F8]">ส่วนต่าง</th>
                    </tr>
                    <tr className="text-[10px] text-[#A8A29E] bg-[#FAFBFD]">
                      {['SYS', 'DIA', 'ชีพจร', 'SYS', 'DIA', 'ชีพจร', 'SYS', 'DIA', 'ชีพจร'].map((h, i) => <th key={i} className={`text-right px-2 py-1 font-semibold ${i % 3 === 0 ? 'border-l border-[#EEF2F8]' : ''}`}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pairRows.map(({ i, a, b }) => (
                      <tr key={i} className="border-t border-[#F1F4F8]">
                        <td className="px-2 py-1.5 text-[#5A6B82]">{i}</td>
                        {METRICS.map((m, j) => <td key={'a' + j} className={`px-2 py-1.5 text-right tnum ${j === 0 ? 'border-l border-[#F1F4F8]' : ''}`}>{a[m.key] ?? '—'}</td>)}
                        {METRICS.map((m, j) => <td key={'b' + j} className={`px-2 py-1.5 text-right tnum ${j === 0 ? 'border-l border-[#F1F4F8]' : ''}`}>{b[m.key] ?? '—'}</td>)}
                        {METRICS.map((m, j) => {
                          const av = a[m.key], bv = b[m.key]
                          const diff = av != null && bv != null ? Math.abs(av - bv) : null
                          return <td key={'d' + j} className={`px-2 py-1.5 text-right tnum font-semibold ${j === 0 ? 'border-l border-[#F1F4F8]' : ''} ${diff == null ? 'text-[#A8A29E]' : diff <= 5 ? 'text-[#157F4C]' : 'text-[#C13540]'}`}>{diff ?? '—'}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#8492A6] mt-1.5">จับคู่รอบที่ 1 ของ {d1} กับรอบที่ 1 ของ {d2} ไปเรื่อยๆ ตามลำดับการวัด · ส่วนต่างน้อย = 2 เครื่องวัดได้ใกล้กัน</p>
            </div>
          )}

          {/* กราฟซ้อน 2 เครื่อง ต่อค่า */}
          <div className="print-avoid-break">
            <div className="text-[13px] font-bold text-[#233047] mb-2">กราฟเทียบตามลำดับการวัด</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METRICS.map((m) => (
                <MultiTrend key={m.key} label={m.label} unit={m.unit}
                  series={devices.map((d, i) => ({ name: d, color: DEV_COLORS[i % DEV_COLORS.length], values: byDevice(d).map((r) => r[m.key]).filter((v): v is number => v != null) }))} />
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-2">
              {devices.map((d, i) => <span key={d} className="text-[11px] text-[#5A6B82] flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full" style={{ background: DEV_COLORS[i % DEV_COLORS.length] }} />{d}</span>)}
            </div>
          </div>

          {/* ประวัติ */}
          <div className="print-avoid-break">
            <div className="text-[13px] font-bold text-[#233047] mb-2">ประวัติการวัด ({rows.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-[10.5px] text-[#8492A6] bg-[#FAFBFD]">
                  <th className="text-left px-2 py-1.5 font-semibold">เวลา</th>
                  <th className="text-left px-2 py-1.5 font-semibold">เครื่อง</th>
                  <th className="text-right px-2 py-1.5 font-semibold">SYS</th>
                  <th className="text-right px-2 py-1.5 font-semibold">DIA</th>
                  <th className="text-right px-2 py-1.5 font-semibold">ชีพจร</th>
                  <th className="text-center px-2 py-1.5 font-semibold">แปลผล</th>
                </tr></thead>
                <tbody>
                  {rows.slice().reverse().map((r) => {
                    const cat = bpCategory(r.systolic, r.diastolic)
                    return (
                      <tr key={r.id} className="border-t border-[#F1F4F8]">
                        <td className="px-2 py-1.5 text-[#5A6B82] whitespace-nowrap tnum">{fmt(r.at)}</td>
                        <td className="px-2 py-1.5 text-[#3C4A5E] break-all">{r.device || '—'}</td>
                        <td className="px-2 py-1.5 text-right tnum font-semibold">{r.systolic ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right tnum font-semibold">{r.diastolic ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right tnum">{r.pulse ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center">{cat && <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 ${cat.cls}`}>{cat.t}</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-[#A8A29E] border-t border-[#EEF2F8] pt-2">แปลผลความดันใช้เกณฑ์ทั่วไปของผู้ใหญ่ (AHA) เป็นข้อมูลสุขภาพเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์</p>
        </div>
      )}
    </div>
  )
}

// กราฟเส้นซ้อนหลายเครื่อง (แกน x = ลำดับรอบการวัด)
function MultiTrend({ label, unit, series }: { label: string; unit: string; series: { name: string; color: string; values: number[] }[] }) {
  const W = 240, H = 120, padT = 8, padB = 18, padL = 30, padR = 8
  const all = series.flatMap((s) => s.values)
  if (all.length === 0) return <div className="rounded-lg border border-[#EEF2F8] bg-white p-2 text-[11.5px] text-[#A8A29E]">{label}: ไม่มีข้อมูล</div>
  let lo = Math.min(...all), hi = Math.max(...all)
  if (lo === hi) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad
  const maxLen = Math.max(...series.map((s) => s.values.length), 1)
  const rng = hi - lo || 1
  const x = (i: number) => padL + (maxLen === 1 ? (W - padL - padR) / 2 : (i / (maxLen - 1)) * (W - padL - padR))
  const y = (v: number) => padT + (1 - (v - lo) / rng) * (H - padT - padB)
  return (
    <div className="rounded-lg border border-[#EEF2F8] bg-white p-2 print-avoid-break">
      <div className="text-[11.5px] font-semibold text-[#233047] mb-0.5">{label} <span className="text-[10px] font-normal text-[#A8A29E]">{unit}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 130, display: 'block' }}>
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#E7EDF4" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#E7EDF4" strokeWidth="1" />
        <text x={padL - 4} y={y(hi) + 3} textAnchor="end" fontSize="8" fill="#A8A29E">{Math.round(hi)}</text>
        <text x={padL - 4} y={y(lo) + 3} textAnchor="end" fontSize="8" fill="#A8A29E">{Math.round(lo)}</text>
        {series.map((s) => (
          <g key={s.name}>
            {s.values.length >= 2 && <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />}
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.3} fill={s.color} />)}
          </g>
        ))}
      </svg>
    </div>
  )
}
