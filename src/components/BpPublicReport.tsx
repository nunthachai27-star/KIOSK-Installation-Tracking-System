'use client'
import { useState } from 'react'
import { BpReportBody, BP_PRINT_CSS, type Reading } from '@/components/bpReport'
import { downloadNodePng, downloadNodePdf } from '@/lib/exportReport'

export function BpPublicReport() {
  const [nameInput, setNameInput] = useState('')
  const [person, setPerson] = useState('')
  const [readings, setReadings] = useState<Reading[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault()
    const nm = nameInput.trim()
    if (!nm) return
    setLoading(true)
    try {
      const r = await fetch(`/api/dev/bp?name=${encodeURIComponent(nm)}`, { cache: 'no-store' })
      const d = r.ok ? await r.json() as { readings: Reading[] } : { readings: [] }
      setReadings(d.readings || []); setPerson(nm)
    } catch { setReadings([]); setPerson(nm) } finally { setLoading(false) }
  }
  function reset() { setReadings(null); setPerson(''); setNameInput('') }

  const safeName = (person || 'bp-report').replace(/[\\/:*?"<>|]+/g, '_')
  async function dl(kind: 'png' | 'pdf') {
    setBusy(kind)
    try { kind === 'png' ? await downloadNodePng('bpreport', `รายงานความดัน-${safeName}`) : await downloadNodePdf('bpreport', `รายงานความดัน-${safeName}`) }
    catch { alert('บันทึกไม่สำเร็จ ลองใหม่') } finally { setBusy('') }
  }

  if (readings === null) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] py-10 px-4">
        <div className="max-w-[420px] mx-auto">
          <div className="flex items-center gap-3 mb-5 justify-center">
            <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center text-[22px] shadow-sm">🩺</span>
            <div>
              <h1 className="text-lg font-bold text-[#1C2A3E]">รายงานผลวัดความดัน</h1>
              <p className="text-[12.5px] text-[#5A6B82]">กรอกชื่อที่ใช้ตอนวัดเพื่อดูผลของคุณ</p>
            </div>
          </div>
          <form onSubmit={lookup} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-5 flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-[#3C4A5E]">ชื่อผู้วัด (ตามที่กรอกในเครื่อง)</label>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} autoFocus placeholder="เช่น Mek"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:border-[var(--brand)]" />
            <button type="submit" disabled={loading || !nameInput.trim()} className="bg-[var(--brand)] text-white text-[14px] font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
              {loading ? 'กำลังค้นหา…' : 'ดูรายงาน'}
            </button>
            <p className="text-[11.5px] text-[#96A2B5]">* ระบบแสดงเฉพาะผลของชื่อนี้ · ผลจากเครื่องที่ไม่ส่งชื่อ (เช่น Yuwell) ที่วัดต่อจากเครื่องที่มีชื่อภายใน 15 นาที จะถูกจับเป็นคนเดียวกัน</p>
          </form>
        </div>
      </div>
    )
  }

  if (readings.length === 0) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] py-10 px-4">
        <div className="max-w-[420px] mx-auto bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-6 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <div className="text-[15px] font-bold text-[#3C4A5E]">ไม่พบผลวัดของ “{person}”</div>
          <p className="text-[12.5px] text-[#8492A6] mt-1">ตรวจสอบว่าพิมพ์ชื่อตรงกับที่ใช้ตอนวัด</p>
          <button onClick={reset} className="mt-4 text-[13px] font-semibold px-4 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">← ลองชื่ออื่น</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-6 px-4">
      <div id="bpreport-wrap" className="max-w-[920px] mx-auto flex flex-col gap-4">
        <style>{BP_PRINT_CSS}</style>
        <div className="no-print flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เปลี่ยนชื่อ</button>
          <div className="flex-1" />
          <button onClick={() => dl('png')} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'png' ? 'กำลังบันทึก…' : '🖼️ โหลดรูป (PNG)'}</button>
          <button onClick={() => dl('pdf')} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'pdf' ? 'กำลังสร้าง…' : '📄 โหลด PDF'}</button>
          <button onClick={() => window.print()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">🖨️ ปริ้น</button>
        </div>
        <BpReportBody person={person} rows={readings} byName />
      </div>
    </div>
  )
}
