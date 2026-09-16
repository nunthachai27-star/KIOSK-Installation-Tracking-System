'use client'
import { useEffect, useRef, useState } from 'react'
import { confirmDialog } from '@/lib/dialog'

type Reading = { id: string; at: string; device: string | null; name: string | null; idcard: string | null; systolic: number | null; diastolic: number | null; pulse: number | null; raw: unknown }

const personLabel = (r: { name: string | null; idcard: string | null }) =>
  [r.name, r.idcard].filter(Boolean).join(' · ') || 'ไม่ระบุผู้วัด'

const timeFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmt = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? '—' : timeFmt.format(d) }

export function BpTestDashboard({ endpoint, reportUrl, reportQr }: { endpoint: string; reportUrl?: string; reportQr?: string }) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [live, setLive] = useState(true)
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState(false)
  const [view, setView] = useState<'live' | 'report'>('live')
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

  // ค่าล่าสุดของแต่ละเครื่อง (ไว้เปรียบเทียบ)
  const byDevice: { device: string; r: Reading }[] = []
  const seen = new Set<string>()
  for (const r of readings) {
    const dev = r.device || 'ไม่ระบุเครื่อง'
    if (!seen.has(dev)) { seen.add(dev); byDevice.push({ device: dev, r }) }
  }
  const metrics: { key: 'systolic' | 'diastolic' | 'pulse'; label: string; unit: string }[] = [
    { key: 'systolic', label: 'SYS', unit: 'mmHg' },
    { key: 'diastolic', label: 'DIA', unit: 'mmHg' },
    { key: 'pulse', label: 'Pulse', unit: 'bpm' },
  ]
  const cmp = (key: 'systolic' | 'diastolic' | 'pulse') => {
    const vals = byDevice.map((d) => d.r[key]).filter((v): v is number => v != null)
    const distinct = new Set(vals)
    return { same: distinct.size <= 1, spread: vals.length ? Math.max(...vals) - Math.min(...vals) : 0, count: vals.length }
  }

  // รายงานสรุป: จัดกลุ่มตาม "เครื่อง + ผู้วัด" → วัดกี่ครั้ง + ค่าแต่ละครั้ง + ค่าเฉลี่ย
  const gmap = new Map<string, { device: string; person: string; items: Reading[] }>()
  for (const r of readings) {
    const device = r.device || 'ไม่ระบุเครื่อง'
    const person = personLabel(r)
    const key = device + '||' + person
    const g = gmap.get(key) ?? { device, person, items: [] }
    g.items.push(r); gmap.set(key, g)
  }
  const groups = Array.from(gmap.values())
  const avg = (items: Reading[], key: 'systolic' | 'diastolic' | 'pulse') => {
    const vs = items.map((r) => r[key]).filter((v): v is number => v != null)
    return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null
  }

  async function clearAll() {
    if (!(await confirmDialog({ title: 'ล้างค่าทดสอบ', message: 'ล้างค่าที่รับมาทั้งหมด?', danger: true, confirmText: 'ล้าง' }))) return
    await fetch('/api/dev/bp', { method: 'DELETE' }).catch(() => {})
    setReadings([]); lastId.current = null
  }
  function copyEndpoint() {
    navigator.clipboard?.writeText(endpoint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  const [copiedReport, setCopiedReport] = useState(false)
  function copyReport() {
    if (!reportUrl) return
    navigator.clipboard?.writeText(reportUrl).then(() => { setCopiedReport(true); setTimeout(() => setCopiedReport(false), 2000) }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-5">
      {/* สลับมุมมอง */}
      <div className="inline-flex rounded-xl border border-[#DCE4EE] bg-white p-1 self-start">
        <button type="button" onClick={() => setView('live')}
          className={`text-[13px] font-semibold px-4 py-1.5 rounded-lg ${view === 'live' ? 'bg-[var(--brand)] text-white' : 'text-[#5A6B82] hover:text-[var(--brand)]'}`}>
          🩺 เรียลไทม์
        </button>
        <button type="button" onClick={() => setView('report')}
          className={`text-[13px] font-semibold px-4 py-1.5 rounded-lg ${view === 'report' ? 'bg-[var(--brand)] text-white' : 'text-[#5A6B82] hover:text-[var(--brand)]'}`}>
          📋 รายงาน{groups.length ? ` (${groups.length})` : ''}
        </button>
      </div>

      {/* วิธีตั้งค่า */}
      <div className={`bg-[#EAF3FF] border border-[#C7DDF7] rounded-2xl p-4 ${view === 'live' ? '' : 'hidden'}`}>
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

      {/* แชร์รายงานสาธารณะ (ลิงก์ + QR) */}
      {reportUrl && (
        <div className={`bg-white border border-[#E7EDF4] rounded-2xl p-4 ${view === 'live' ? '' : 'hidden'}`}>
          <div className="text-[13px] font-bold text-[#233047] mb-2">🔗 แชร์รายงาน (สาธารณะ · อ่านอย่างเดียว)</div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <p className="text-[12px] text-[#8492A6] mb-2">เปิดดูรายงานได้โดยไม่ต้องล็อกอิน · เลขบัตรถูกปิดบังบางส่วน</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-[12.5px] bg-[#F6F8FB] border border-[#E7EDF4] rounded-lg px-3 py-2 text-[#1C1917] break-all select-all font-mono">{reportUrl}</code>
                <button type="button" onClick={copyReport} className="text-[12.5px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">{copiedReport ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}</button>
                <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">↗ เปิด</a>
              </div>
            </div>
            {reportQr && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reportQr} alt="QR รายงาน" width={120} height={120} className="rounded-lg border border-[#E7EDF4]" />
                <div className="text-[11px] text-[#8492A6] mt-1">สแกนดูรายงาน</div>
              </div>
            )}
          </div>
        </div>
      )}

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
      {view === 'live' && (latest ? (
        <div className={`rounded-2xl border p-6 transition ${flash ? 'border-[#16A34A] bg-[#EAFBF1]' : 'border-[#E7EDF4] bg-white'}`}>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[12.5px] text-[#8492A6]">ค่าล่าสุด · รับเมื่อ {fmt(latest.at)}</span>
            <span className="text-[11.5px] font-semibold text-[#1B5FD9] bg-[#E4EEFF] rounded-full px-2.5 py-0.5">🖥️ {latest.device || 'ไม่ระบุเครื่อง'}</span>
            {(latest.name || latest.idcard) && <span className="text-[11.5px] font-semibold text-[#7A44C6] bg-[#F1EAFB] rounded-full px-2.5 py-0.5">👤 {personLabel(latest)}</span>}
          </div>
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
      ))}

      {/* เปรียบเทียบหลายเครื่อง — วัดพร้อมกันแล้วดูว่าค่าตรงกันไหม */}
      {view === 'live' && byDevice.length > 1 && (
        <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 text-[13px] font-bold text-[#233047] border-b border-[#EEF2F8] flex items-center justify-between">
            <span>เปรียบเทียบเครื่อง ({byDevice.length} เครื่อง)</span>
            <span className="text-[11.5px] font-normal text-[#8492A6]">ใช้ค่าล่าสุดของแต่ละเครื่อง</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[11.5px] uppercase text-[#8492A6] bg-[#FAFBFD]">
                <th className="text-left px-4 py-2 font-semibold">ค่า</th>
                {byDevice.map((d) => (
                  <th key={d.device} className="text-right px-3 py-2 font-semibold">
                    <div className="text-[#3C4A5E] normal-case">{d.device}</div>
                    <div className="text-[10.5px] font-normal text-[#A8A29E] normal-case">{fmt(d.r.at)}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-semibold">ผล</th>
              </tr></thead>
              <tbody>
                {metrics.map((m) => {
                  const c = cmp(m.key)
                  return (
                    <tr key={m.key} className="border-t border-[#F1F4F8]">
                      <td className="px-4 py-2.5 font-semibold text-[#1C1917]">{m.label} <span className="text-[11px] font-normal text-[#A8A29E]">{m.unit}</span></td>
                      {byDevice.map((d) => (
                        <td key={d.device} className="px-3 py-2.5 text-right tnum font-bold text-[15px]">{d.r[m.key] ?? '—'}</td>
                      ))}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {c.count < 2
                          ? <span className="text-[12px] text-[#A8A29E]">—</span>
                          : c.same
                            ? <span className="text-[12px] font-semibold text-[#157F4C] bg-[#E7F4EE] rounded-full px-2.5 py-0.5">✓ เท่ากัน</span>
                            : <span className="text-[12px] font-semibold text-[#C13540] bg-[#FBE4E4] rounded-full px-2.5 py-0.5">⚠ ต่าง {c.spread}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11.5px] text-[#8492A6] border-t border-[#F1F4F8]">💡 วัดทั้งสองเครื่องในเวลาใกล้กัน แล้วดูแถว “ผล” — เขียว = ค่าตรงกัน, แดง = ต่างกัน (ตัวเลขคือส่วนต่างสูงสุด)</div>
        </div>
      )}

      {/* รายงานสรุป — แยกตามเครื่อง + ผู้วัด */}
      {view === 'report' && groups.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-bold text-[#233047]">📋 รายงานสรุป (แยกตามเครื่อง + ผู้วัด)</div>
          {groups.map((g) => (
            <div key={g.device + g.person} className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#EEF2F8] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-[#1B5FD9] bg-[#E4EEFF] rounded-full px-2.5 py-0.5">🖥️ {g.device}</span>
                  <span className="text-[12px] font-semibold text-[#7A44C6] bg-[#F1EAFB] rounded-full px-2.5 py-0.5">👤 {g.person}</span>
                  <span className="text-[13px] font-bold text-[#233047]">วัด {g.items.length} ครั้ง</span>
                </div>
                <div className="text-[12px] text-[#5A6B82]">เฉลี่ย <b className="tnum">{avg(g.items, 'systolic') ?? '—'}</b>/<b className="tnum">{avg(g.items, 'diastolic') ?? '—'}</b> · ชีพจร <b className="tnum">{avg(g.items, 'pulse') ?? '—'}</b></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-[11.5px] uppercase text-[#8492A6] bg-[#FAFBFD]">
                    <th className="text-left px-4 py-1.5 font-semibold w-10">#</th>
                    <th className="text-left px-3 py-1.5 font-semibold normal-case">เวลา</th>
                    <th className="text-right px-3 py-1.5 font-semibold">SYS</th>
                    <th className="text-right px-3 py-1.5 font-semibold">DIA</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Pulse</th>
                  </tr></thead>
                  <tbody>
                    {g.items.map((r, i) => (
                      <tr key={r.id} className="border-t border-[#F1F4F8]">
                        <td className="px-4 py-1.5 text-[#A8A29E] tnum">{g.items.length - i}</td>
                        <td className="px-3 py-1.5 text-[#5A6B82] tnum">{fmt(r.at)}</td>
                        <td className="px-3 py-1.5 text-right tnum font-semibold">{r.systolic ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right tnum font-semibold">{r.diastolic ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right tnum font-semibold">{r.pulse ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ประวัติทั้งหมด (เรียงตามเวลา) */}
      {view === 'report' && readings.length > 1 && (
        <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 text-[13px] font-bold text-[#233047] border-b border-[#EEF2F8]">ประวัติที่รับมา ({readings.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[11.5px] uppercase text-[#8492A6] bg-[#FAFBFD]">
                <th className="text-left px-4 py-2 font-semibold">เวลา</th>
                <th className="text-left px-3 py-2 font-semibold normal-case">เครื่อง</th>
                <th className="text-left px-3 py-2 font-semibold normal-case">ผู้วัด</th>
                <th className="text-right px-3 py-2 font-semibold">SYS</th>
                <th className="text-right px-3 py-2 font-semibold">DIA</th>
                <th className="text-right px-3 py-2 font-semibold">Pulse</th>
              </tr></thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-t border-[#F1F4F8]">
                    <td className="px-4 py-2 text-[#5A6B82] tnum">{fmt(r.at)}</td>
                    <td className="px-3 py-2 text-[#3C4A5E]">{r.device || 'ไม่ระบุ'}</td>
                    <td className="px-3 py-2 text-[#3C4A5E]">{(r.name || r.idcard) ? personLabel(r) : '—'}</td>
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
