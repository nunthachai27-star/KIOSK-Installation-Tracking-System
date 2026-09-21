'use client'
import { useEffect, useState } from 'react'
import { FAT_METRICS } from '@/lib/fatTest'

type Reading = { id: string; at: string; device: string | null; name: string | null; idcard: string | null; metrics: Record<string, number> }

const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : timeFmt.format(d) }
const metricLabel = (key: string) => FAT_METRICS.find((m) => m.key === key)?.label || key
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
// ปิดบังเลขบัตรบางส่วน (หน้าสาธารณะ) — เก็บ 4 ตัวหน้า + 3 ตัวท้าย
const maskId = (id: string | null) => {
  if (!id) return ''
  const s = id.trim()
  return s.length <= 7 ? s : s.slice(0, 4) + '*'.repeat(s.length - 7) + s.slice(-3)
}
const personLabel = (r: { name: string | null; idcard: string | null }) =>
  [r.name, maskId(r.idcard)].filter(Boolean).join(' · ') || 'ไม่ระบุผู้วัด'
const orderKeys = (keys: string[]) => {
  const order = FAT_METRICS.map((m) => m.key)
  return [...keys].sort((a, b) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)))
}

export function FatReportPublic() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch('/api/dev/fat', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json() as { readings: Reading[] }
        if (alive) { setReadings(d.readings || []); setLoaded(true) }
      } catch { /* เงียบ */ }
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const gmap = new Map<string, { device: string; person: string; items: Reading[] }>()
  for (const r of readings) {
    const device = r.device || 'ไม่ระบุเครื่อง'; const person = personLabel(r); const key = device + '||' + person
    const g = gmap.get(key) ?? { device, person, items: [] }; g.items.push(r); gmap.set(key, g)
  }
  const groups = Array.from(gmap.values())
  const avg = (items: Reading[], key: string) => {
    const vs = items.map((r) => r.metrics?.[key]).filter((v): v is number => v != null)
    return vs.length ? Number((vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1)) : null
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-8 px-4">
      <div className="max-w-[900px] mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center text-[22px] shadow-sm">⚖️</span>
          <div>
            <h1 className="text-xl font-bold text-[#1C2A3E]">รายงานเครื่องวัดไขมัน</h1>
            <p className="text-[12.5px] text-[#5A6B82]">อัปเดตอัตโนมัติ · แสดงผลอย่างเดียว</p>
          </div>
        </div>

        {groups.map((g) => {
          const gKeys = orderKeys(Array.from(new Set(g.items.flatMap((r) => Object.keys(r.metrics || {})))))
          return (
            <div key={g.device + g.person} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#EEF2F8] flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold text-[#1B5FD9] bg-[#E4EEFF] rounded-full px-2.5 py-0.5">🖥️ {g.device}</span>
                <span className="text-[12px] font-semibold text-[#7A44C6] bg-[#F1EAFB] rounded-full px-2.5 py-0.5">👤 {g.person}</span>
                <span className="text-[13px] font-bold text-[#233047]">วัด {g.items.length} ครั้ง</span>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-[13px]">
                <thead><tr className="text-[11.5px] text-[#8492A6] bg-[#FAFBFD]">
                  <th className="text-left px-4 py-1.5 font-semibold w-10">#</th>
                  <th className="text-left px-3 py-1.5 font-semibold">เวลา</th>
                  {gKeys.map((k) => <th key={k} className="text-right px-3 py-1.5 font-semibold whitespace-nowrap">{metricLabel(k)}</th>)}
                </tr></thead>
                <tbody>
                  {g.items.map((r, i) => (
                    <tr key={r.id} className="border-t border-[#F1F4F8]">
                      <td className="px-4 py-1.5 text-[#A8A29E] tnum">{g.items.length - i}</td>
                      <td className="px-3 py-1.5 text-[#5A6B82] tnum">{fmt(r.at)}</td>
                      {gKeys.map((k) => <td key={k} className="px-3 py-1.5 text-right tnum font-semibold">{r.metrics?.[k] != null ? fmtNum(r.metrics[k]) : '—'}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#E7EDF4] bg-[#FAFBFD]">
                    <td className="px-4 py-1.5" />
                    <td className="px-3 py-1.5 text-[11.5px] font-bold text-[#233047]">เฉลี่ย</td>
                    {gKeys.map((k) => <td key={k} className="px-3 py-1.5 text-right tnum font-bold text-[#157F4C]">{avg(g.items, k) ?? '—'}</td>)}
                  </tr>
                </tbody>
              </table></div>
            </div>
          )
        })}

        {loaded && groups.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-[#C7D3E2] p-10 text-center text-[#8492A6]">ยังไม่มีข้อมูลที่รับเข้ามา</div>
        )}
        <div className="text-center text-[11.5px] text-[#A8A29E]">BMS Smart Hospital · รายงานเครื่องวัดไขมัน</div>
      </div>
    </div>
  )
}
