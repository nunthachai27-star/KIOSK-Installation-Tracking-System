'use client'
import { useEffect, useRef, useState } from 'react'
import { confirmDialog } from '@/lib/dialog'

type Reading = { id: string; at: string; systolic: number | null; diastolic: number | null; pulse: number | null; raw: unknown }

const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : timeFmt.format(d) }

export function BpTestDashboard({ endpoint }: { endpoint: string }) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [live, setLive] = useState(true)
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState(false)
  const lastId = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch('/api/dev/bp', { cache: 'no-store' })
        if (!r.ok) return
        const d = await r.json() as { readings: Reading[] }
        if (!alive) return
        setReadings(d.readings || [])
        const top = d.readings?.[0]
        if (top && top.id !== lastId.current) {
          if (lastId.current !== null) { setFlash(true); setTimeout(() => setFlash(false), 1200) }
          lastId.current = top.id
        }
      } catch { /* เงียบ */ }
    }
    poll()
    const iv = live ? setInterval(poll, 1000) : null
    return () => { alive = false; if (iv) clearInterval(iv) }
  }, [live])

  const latest = readings[0]

  async function clearAll() {
    if (!(await confirmDialog({ title: 'ล้างค่าทดสอบ', message: 'ล้างค่าที่รับมาทั้งหมด?', danger: true, confirmText: 'ล้าง' }))) return
    await fetch('/api/dev/bp', { method: 'DELETE' }).catch(() => {})
    setReadings([]); lastId.current = null
  }
  function copyEndpoint() {
    navigator.clipboard?.writeText(endpoint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-5">
      {/* วิธีตั้งค่า */}
      <div className="bg-[#EAF3FF] border border-[#C7DDF7] rounded-2xl p-4">
        <div className="text-[13px] font-bold text-[#1B5FD9] mb-1.5">🩺 วิธีทดสอบ</div>
        <p className="text-[12.5px] text-[#3C4A5E] leading-relaxed mb-2">
          ที่เครื่องวัดความดัน → เมนู <b>“การตั้งค่าอื่น ๆ”</b> → ช่อง <b>“แก้ไขที่อยู่สำหรับอัปโหลดข้อมูล”</b> ใส่ URL ด้านล่างนี้ แล้วกดยืนยัน · จากนั้นวัดความดัน 1 ครั้ง — ค่าจะเด้งขึ้นหน้านี้อัตโนมัติ
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[13px] bg-white border border-[#C7DDF7] rounded-lg px-3 py-2 text-[#1C1917] break-all select-all font-mono">{endpoint}</code>
          <button type="button" onClick={copyEndpoint} className="text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">
            {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
          </button>
        </div>
      </div>

      {/* สถานะ + ปุ่ม */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={`w-2.5 h-2.5 rounded-full ${live ? 'bg-[#16A34A] animate-pulse' : 'bg-[#9AA6B5]'}`}></span>
          <span className="font-semibold text-[#3C4A5E]">{live ? 'กำลังรอรับค่า (เรียลไทม์)' : 'หยุดรับชั่วคราว'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLive(v => !v)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">
            {live ? '⏸ หยุด' : '▶ เริ่มรับ'}
          </button>
          <button type="button" onClick={clearAll} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#C13540] hover:border-[#C13540]">🗑️ ล้างค่า</button>
        </div>
      </div>

      {/* การ์ดค่าล่าสุด */}
      {latest ? (
        <div className={`rounded-2xl border p-6 transition ${flash ? 'border-[#16A34A] bg-[#EAFBF1]' : 'border-[#E7EDF4] bg-white'}`}>
          <div className="text-[12.5px] text-[#8492A6] mb-4">ค่าล่าสุด · รับเมื่อ {fmt(latest.at)}</div>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="ความดันตัวบน (SYS)" value={latest.systolic} unit="mmHg" color="#C13540" />
            <Stat label="ความดันตัวล่าง (DIA)" value={latest.diastolic} unit="mmHg" color="#1B5FD9" />
            <Stat label="ชีพจร (Pulse)" value={latest.pulse} unit="bpm" color="#157F4C" />
          </div>
          <details className="mt-4">
            <summary className="text-[12px] text-[#8492A6] cursor-pointer select-none">ดูข้อมูลดิบที่เครื่องส่งมา (raw)</summary>
            <pre className="mt-2 text-[11.5px] bg-[#F6F8FB] border border-[#E7EDF4] rounded-lg p-3 overflow-x-auto text-[#1C1917] whitespace-pre-wrap break-all">{JSON.stringify(latest.raw, null, 2)}</pre>
          </details>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C7D3E2] bg-white p-10 text-center">
          <div className="text-5xl mb-3 animate-pulse">🩺</div>
          <div className="text-[15px] font-bold text-[#3C4A5E]">รอรับค่าจากเครื่องวัดความดัน…</div>
          <div className="text-[12.5px] text-[#8492A6] mt-1">ตั้งค่า URL ในเครื่องแล้ววัด 1 ครั้ง ค่าจะขึ้นที่นี่ทันที</div>
        </div>
      )}

      {/* ประวัติ */}
      {readings.length > 1 && (
        <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 text-[13px] font-bold text-[#233047] border-b border-[#EEF2F8]">ประวัติที่รับมา ({readings.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[11.5px] uppercase text-[#8492A6] bg-[#FAFBFD]">
                <th className="text-left px-4 py-2 font-semibold">เวลา</th>
                <th className="text-right px-3 py-2 font-semibold">SYS</th>
                <th className="text-right px-3 py-2 font-semibold">DIA</th>
                <th className="text-right px-3 py-2 font-semibold">Pulse</th>
              </tr></thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-t border-[#F1F4F8]">
                    <td className="px-4 py-2 text-[#5A6B82] tnum">{fmt(r.at)}</td>
                    <td className="px-3 py-2 text-right tnum font-semibold">{r.systolic ?? '—'}</td>
                    <td className="px-3 py-2 text-right tnum font-semibold">{r.diastolic ?? '—'}</td>
                    <td className="px-3 py-2 text-right tnum font-semibold">{r.pulse ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  return (
    <div className="text-center rounded-xl bg-[#FAFBFD] border border-[#EEF2F8] py-4">
      <div className="text-[12px] text-[#8492A6] mb-1">{label}</div>
      <div className="text-[38px] font-bold leading-none tnum" style={{ color: value == null ? '#B4BCC8' : color }}>{value ?? '—'}</div>
      <div className="text-[11.5px] text-[#A8A29E] mt-1">{unit}</div>
    </div>
  )
}
