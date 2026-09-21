'use client'
import { useState } from 'react'
import { FatReportBody, FAT_PRINT_CSS, type Reading } from '@/components/fatReport'

export function FatPublicReport() {
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
      const r = await fetch(`/api/dev/fat?name=${encodeURIComponent(nm)}`, { cache: 'no-store' })
      const d = r.ok ? await r.json() as { readings: Reading[] } : { readings: [] }
      setReadings(d.readings || []); setPerson(nm)
    } catch { setReadings([]); setPerson(nm) } finally { setLoading(false) }
  }
  function reset() { setReadings(null); setPerson(''); setNameInput('') }

  const safeName = (person || 'report').replace(/[\\/:*?"<>|]+/g, '_')
  async function downloadPng() {
    const node = document.getElementById('fatreport'); if (!node) return
    setBusy('png')
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a'); a.href = url; a.download = `รายงาน-${safeName}.png`; a.click()
    } catch { alert('บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้ง') } finally { setBusy('') }
  }
  async function downloadPdf() {
    const node = document.getElementById('fatreport'); if (!node) return
    setBusy('pdf')
    try {
      const { toPng } = await import('html-to-image')
      const { jsPDF } = await import('jspdf')
      const url = await toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const img = new Image(); img.src = url; await img.decode()
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const margin = 8, pageW = 210 - margin * 2, pageH = 297 - margin * 2
      const pxPerMm = img.width / pageW
      const pageHpx = pageH * pxPerMm
      let sy = 0, page = 0
      while (sy < img.height) {
        const sliceH = Math.min(pageHpx, img.height - sy)
        const c = document.createElement('canvas'); c.width = img.width; c.height = sliceH
        const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, sy, img.width, sliceH, 0, 0, img.width, sliceH) }
        if (page > 0) pdf.addPage()
        pdf.addImage(c.toDataURL('image/png'), 'PNG', margin, margin, pageW, sliceH / pxPerMm)
        sy += sliceH; page++
      }
      pdf.save(`รายงาน-${safeName}.pdf`)
    } catch { alert('สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง') } finally { setBusy('') }
  }

  // ยังไม่กรอกชื่อ → หน้ากรอกชื่อ
  if (readings === null) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] py-10 px-4">
        <div className="max-w-[420px] mx-auto">
          <div className="flex items-center gap-3 mb-5 justify-center">
            <span className="w-11 h-11 rounded-2xl bg-white grid place-items-center text-[22px] shadow-sm">⚖️</span>
            <div>
              <h1 className="text-lg font-bold text-[#1C2A3E]">รายงานผลวัดองค์ประกอบร่างกาย</h1>
              <p className="text-[12.5px] text-[#5A6B82]">กรอกชื่อที่ใช้ตอนวัดเพื่อดูผลของคุณ</p>
            </div>
          </div>
          <form onSubmit={lookup} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-5 flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-[#3C4A5E]">ชื่อผู้วัด (ตามที่กรอกในเครื่อง)</label>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} autoFocus placeholder="เช่น Tiger"
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:border-[var(--brand)]" />
            <button type="submit" disabled={loading || !nameInput.trim()} className="bg-[var(--brand)] text-white text-[14px] font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
              {loading ? 'กำลังค้นหา…' : 'ดูรายงาน'}
            </button>
            <p className="text-[11.5px] text-[#96A2B5]">* ต้องกรอกชื่อให้ตรงกับที่กรอกบนเครื่องวัด · ระบบแสดงเฉพาะผลของชื่อนี้</p>
          </form>
        </div>
      </div>
    )
  }

  // ไม่พบข้อมูล
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
      <div id="fatreport-wrap" className="max-w-[900px] mx-auto flex flex-col gap-4">
        <style>{FAT_PRINT_CSS}</style>
        <div className="no-print flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เปลี่ยนชื่อ</button>
          <div className="flex-1" />
          <button onClick={downloadPng} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'png' ? 'กำลังบันทึก…' : '🖼️ โหลดรูป (PNG)'}</button>
          <button onClick={downloadPdf} disabled={!!busy} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] disabled:opacity-60">{busy === 'pdf' ? 'กำลังสร้าง…' : '📄 โหลด PDF'}</button>
          <button onClick={() => window.print()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">🖨️ ปริ้น</button>
        </div>
        <FatReportBody person={person} rows={readings} />
      </div>
    </div>
  )
}
