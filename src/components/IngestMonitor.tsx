'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type Log = { id: string; at: string; kind: string; device: string | null; name: string | null; ip: string | null; status: string; bytes: number | null; summary: string | null }

const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : timeFmt.format(d) }
const STATUS: Record<string, { t: string; cls: string }> = {
  ok: { t: 'รับแล้ว', cls: 'text-[#157F4C] bg-[#E7F4EE]' },
  duplicate: { t: 'ซ้ำ (ข้าม)', cls: 'text-[#B45309] bg-[#FDECD3]' },
  no_value: { t: 'ไม่มีค่า', cls: 'text-[#8492A6] bg-[#EEF1F5]' },
  rate_limit: { t: 'บล็อก (ถี่เกิน)', cls: 'text-[#C13540] bg-[#FBE4E4]' },
  too_large: { t: 'บล็อก (ใหญ่เกิน)', cls: 'text-[#C13540] bg-[#FBE4E4]' },
  unparsed: { t: 'อ่านไม่ได้', cls: 'text-[#C13540] bg-[#FBE4E4]' },
}

export function IngestMonitor() {
  const [logs, setLogs] = useState<Log[]>([])
  const [live, setLive] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [flash, setFlash] = useState(false)
  const lastId = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const r = await fetch('/api/dev/ingest-log', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json() as { logs: Log[] }
        if (!alive) return
        setLogs(d.logs || []); setLoaded(true)
        const top = d.logs?.[0]
        if (top && top.id !== lastId.current) {
          if (lastId.current !== null) { setFlash(true); setTimeout(() => setFlash(false), 1000) }
          lastId.current = top.id
        }
      } catch { /* เงียบ */ }
    }
    poll()
    const iv = live ? setInterval(poll, 2000) : null
    return () => { alive = false; if (iv) clearInterval(iv) }
  }, [live])

  // สรุปต่อเครื่อง (24 ชม.ล่าสุด)
  const perDevice = useMemo(() => {
    const since = Date.now() - 24 * 3600 * 1000
    const m = new Map<string, { total: number; ok: number; dup: number; blocked: number; last: string }>()
    for (const l of logs) {
      if (new Date(l.at).getTime() < since) continue
      const key = `${l.kind}·${l.device || 'ไม่ระบุ'}`
      const g = m.get(key) || { total: 0, ok: 0, dup: 0, blocked: 0, last: l.at }
      g.total++
      if (l.status === 'ok') g.ok++
      else if (l.status === 'duplicate') g.dup++
      else if (l.status === 'rate_limit' || l.status === 'too_large') g.blocked++
      if (new Date(l.at) > new Date(g.last)) g.last = l.at
      m.set(key, g)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total)
  }, [logs])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={`w-2.5 h-2.5 rounded-full ${live ? 'bg-[#16A34A] animate-pulse' : 'bg-[#9AA6B5]'}`} />
          <span className="font-semibold text-[#3C4A5E]">{live ? 'กำลังมอนิเตอร์ (เรียลไทม์)' : 'หยุดชั่วคราว'}</span>
          {flash && <span className="text-[11.5px] text-[#157F4C] font-semibold">● มีข้อมูลเข้าใหม่</span>}
        </div>
        <button onClick={() => setLive((v) => !v)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">{live ? '⏸ หยุด' : '▶ เริ่ม'}</button>
      </div>

      {/* สรุปต่อเครื่อง 24 ชม. */}
      <div>
        <div className="text-[13px] font-bold text-[#233047] mb-2">เครื่องที่ส่งข้อมูล (24 ชม.ล่าสุด)</div>
        {perDevice.length === 0 ? <div className="text-[12.5px] text-[#8492A6]">ยังไม่มีข้อมูลเข้าใน 24 ชม.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {perDevice.map(([key, g]) => (
              <div key={key} className="bg-white border border-[#E7EDF4] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-[#233047] break-all">{key}</div>
                  <div className="text-[11px] text-[#8492A6] whitespace-nowrap">ล่าสุด {fmt(g.last)}</div>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[12px]">
                  <span className="text-[#5A6B82]">ทั้งหมด <b>{g.total}</b></span>
                  <span className="text-[#157F4C]">รับ {g.ok}</span>
                  {g.dup > 0 && <span className="text-[#B45309]">ซ้ำ {g.dup}</span>}
                  {g.blocked > 0 && <span className="text-[#C13540]">บล็อก {g.blocked}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* log ล่าสุด */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
        <div className={`px-4 py-2.5 text-[13px] font-bold text-[#233047] border-b border-[#EEF2F8] transition ${flash ? 'bg-[#EAFBF1]' : ''}`}>Log การรับข้อมูล ({logs.length})</div>
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 bg-[#FAFBFD]"><tr className="text-[10.5px] uppercase text-[#8492A6]">
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">เวลา</th>
              <th className="text-left px-3 py-2 font-semibold">ชนิด</th>
              <th className="text-left px-3 py-2 font-semibold normal-case">เครื่อง</th>
              <th className="text-left px-3 py-2 font-semibold normal-case">ผู้วัด</th>
              <th className="text-left px-3 py-2 font-semibold normal-case">ค่า/สรุป</th>
              <th className="text-center px-3 py-2 font-semibold">สถานะ</th>
              <th className="text-left px-3 py-2 font-semibold normal-case">IP</th>
            </tr></thead>
            <tbody>
              {loaded && logs.length === 0 && <tr><td colSpan={7} className="text-center text-[#8492A6] py-8">ยังไม่มี log — รอเครื่องส่งข้อมูล</td></tr>}
              {logs.map((l) => {
                const st = STATUS[l.status] || { t: l.status, cls: 'text-[#8492A6] bg-[#EEF1F5]' }
                return (
                  <tr key={l.id} className="border-t border-[#F1F4F8]">
                    <td className="px-3 py-1.5 text-[#5A6B82] whitespace-nowrap tnum">{fmt(l.at)}</td>
                    <td className="px-3 py-1.5"><span className={`text-[11px] font-semibold rounded px-1.5 py-0.5 ${l.kind === 'bp' ? 'text-[#1B5FD9] bg-[#E4EEFF]' : 'text-[#7A44C6] bg-[#F1EAFB]'}`}>{l.kind === 'bp' ? '🩺 ความดัน' : '⚖️ ไขมัน'}</span></td>
                    <td className="px-3 py-1.5 text-[#3C4A5E] break-all">{l.device || '—'}</td>
                    <td className="px-3 py-1.5 text-[#3C4A5E]">{l.name || '—'}</td>
                    <td className="px-3 py-1.5 text-[#5A6B82]">{l.summary || '—'}</td>
                    <td className="px-3 py-1.5 text-center whitespace-nowrap"><span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.t}</span></td>
                    <td className="px-3 py-1.5 text-[#A8A29E] tnum">{l.ip || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#A8A29E]">แสดง log ล่าสุด 300 รายการ · เก็บย้อนหลัง 30 วัน · “ซ้ำ” = เครื่องส่ง examNo เดิมที่มีอยู่แล้ว ระบบข้ามให้อัตโนมัติ</p>
    </div>
  )
}
