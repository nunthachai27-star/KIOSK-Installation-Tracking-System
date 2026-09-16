'use client'
import { useEffect, useState } from 'react'

type Reading = { id: string; at: string; device: string | null; name: string | null; idcard: string | null; systolic: number | null; diastolic: number | null; pulse: number | null }

const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : timeFmt.format(d) }
// ปิดบังเลขบัตรบางส่วน (หน้าสาธารณะ) — เก็บ 4 ตัวหน้า + 3 ตัวท้าย
const maskId = (id: string | null) => {
  if (!id) return ''
  const s = id.trim()
  return s.length <= 7 ? s : s.slice(0, 4) + '*'.repeat(s.length - 7) + s.slice(-3)
}
const personLabel = (r: { name: string | null; idcard: string | null }) =>
  [r.name, maskId(r.idcard)].filter(Boolean).join(' · ') || 'ไม่ระบุผู้วัด'

export function BpReportPublic() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch('/api/dev/bp', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json() as { readings: Reading[] }
        if (alive) { setReadings(d.readings || []); setLoaded(true) }
      } catch { /* เงียบ */ }
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  // ค่าล่าสุดต่อเครื่อง (เปรียบเทียบ)
  const byDevice: { device: string; r: Reading }[] = []
  const seen = new Set<string>()
  for (const r of readings) { const dev = r.device || 'ไม่ระบุเครื่อง'; if (!seen.has(dev)) { seen.add(dev); byDevice.push({ device: dev, r }) } }
  const metrics = [{ key: 'systolic', label: 'SYS', unit: 'mmHg' }, { key: 'diastolic', label: 'DIA', unit: 'mmHg' }, { key: 'pulse', label: 'Pulse', unit: 'bpm' }] as const
  const cmp = (key: 'systolic' | 'diastolic' | 'pulse') => {
    const vals = byDevice.map((d) => d.r[key]).filter((v): v is number => v != null)
    return { same: new Set(vals).size <= 1, spread: vals.length ? Math.max(...vals) - Math.min(...vals) : 0, count: vals.length }
  }
  // กลุ่ม เครื่อง+ผู้วัด
  const gmap = new Map<string, { device: string; person: string; items: Reading[] }>()
  for (const r of readings) {
    const device = r.device || 'ไม่ระบุเครื่อง'; const person = personLabel(r); const key = device + '||' + person
    const g = gmap.get(key) ?? { device, person, items: [] }; g.items.push(r); gmap.set(key, g)
  }
  const groups = Array.from(gmap.values())
  const avg = (items: Reading[], key: 'systolic' | 'diastolic' | 'pulse') => {
    const vs = items.map((r) => r[key]).filter((v): v is number => v != null)
    return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-8 px-4">
      <div className="max-w-[860px] mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center text-[22px] shadow-sm">🩺</span>
          <div>
            <h1 className="text-xl font-bold text-[#1C2A3E]">รายงานเครื่องวัดความดัน</h1>
            <p className="text-[12.5px] text-[#5A6B82]">อัปเดตอัตโนมัติ · แสดงผลอย่างเดียว</p>
          </div>
        </div>

        {byDevice.length > 1 && (
          <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 text-[13px] font-bold text-[#233047] border-b border-[#EEF2F8]">เปรียบเทียบเครื่อง ({byDevice.length})</div>
            <div className="overflow-x-auto"><table className="w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-[#8492A6] bg-[#FAFBFD]">
                <th className="text-left px-4 py-2 font-semibold">ค่า</th>
                {byDevice.map((d) => <th key={d.device} className="text-right px-3 py-2 font-semibold">{d.device}</th>)}
                <th className="text-center px-3 py-2 font-semibold">ผล</th>
              </tr></thead>
              <tbody>{metrics.map((m) => { const c = cmp(m.key); return (
                <tr key={m.key} className="border-t border-[#F1F4F8]">
                  <td className="px-4 py-2.5 font-semibold text-[#1C1917]">{m.label} <span className="text-[11px] font-normal text-[#A8A29E]">{m.unit}</span></td>
                  {byDevice.map((d) => <td key={d.device} className="px-3 py-2.5 text-right tnum font-bold text-[15px]">{d.r[m.key] ?? '—'}</td>)}
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">{c.count < 2 ? <span className="text-[12px] text-[#A8A29E]">—</span> : c.same ? <span className="text-[12px] font-semibold text-[#157F4C] bg-[#E7F4EE] rounded-full px-2.5 py-0.5">✓ เท่ากัน</span> : <span className="text-[12px] font-semibold text-[#C13540] bg-[#FBE4E4] rounded-full px-2.5 py-0.5">⚠ ต่าง {c.spread}</span>}</td>
                </tr>)})}</tbody>
            </table></div>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.device + g.person} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#EEF2F8] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold text-[#1B5FD9] bg-[#E4EEFF] rounded-full px-2.5 py-0.5">🖥️ {g.device}</span>
                <span className="text-[12px] font-semibold text-[#7A44C6] bg-[#F1EAFB] rounded-full px-2.5 py-0.5">👤 {g.person}</span>
                <span className="text-[13px] font-bold text-[#233047]">วัด {g.items.length} ครั้ง</span>
              </div>
              <div className="text-[12px] text-[#5A6B82]">เฉลี่ย <b className="tnum">{avg(g.items, 'systolic') ?? '—'}</b>/<b className="tnum">{avg(g.items, 'diastolic') ?? '—'}</b> · ชีพจร <b className="tnum">{avg(g.items, 'pulse') ?? '—'}</b></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-[#8492A6] bg-[#FAFBFD]">
                <th className="text-left px-4 py-1.5 font-semibold w-10">#</th><th className="text-left px-3 py-1.5 font-semibold">เวลา</th>
                <th className="text-right px-3 py-1.5 font-semibold">SYS</th><th className="text-right px-3 py-1.5 font-semibold">DIA</th><th className="text-right px-3 py-1.5 font-semibold">Pulse</th>
              </tr></thead>
              <tbody>{g.items.map((r, i) => (
                <tr key={r.id} className="border-t border-[#F1F4F8]">
                  <td className="px-4 py-1.5 text-[#A8A29E] tnum">{g.items.length - i}</td>
                  <td className="px-3 py-1.5 text-[#5A6B82] tnum">{fmt(r.at)}</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">{r.systolic ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">{r.diastolic ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">{r.pulse ?? '—'}</td>
                </tr>))}</tbody>
            </table></div>
          </div>
        ))}

        {loaded && groups.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-[#C7D3E2] p-10 text-center text-[#8492A6]">ยังไม่มีข้อมูลที่รับเข้ามา</div>
        )}
      </div>
    </div>
  )
}
