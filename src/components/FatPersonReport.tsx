'use client'
import { useEffect, useMemo, useState } from 'react'
import { FatReportBody, FAT_PRINT_CSS, type Reading } from '@/components/fatReport'
import { confirmDialog } from '@/lib/dialog'

export function FatPersonReport({ canDelete }: { canDelete?: boolean }) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loaded, setLoaded] = useState(false)
  const [person, setPerson] = useState<string>('')

  async function load() {
    try {
      const r = await fetch('/api/dev/fat', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json() as { readings: Reading[] }
      setReadings(d.readings || []); setLoaded(true)
    } catch { /* เงียบ */ }
  }
  useEffect(() => { load() }, [])

  const persons = useMemo(() => {
    const s = new Set<string>()
    for (const r of readings) s.add(r.name?.trim() || 'ไม่ระบุผู้วัด')
    return Array.from(s)
  }, [readings])
  useEffect(() => {
    if (!person && readings.length) setPerson(readings[0].name?.trim() || 'ไม่ระบุผู้วัด')
  }, [readings, person])

  const rows = useMemo(() => readings.filter((r) => (r.name?.trim() || 'ไม่ระบุผู้วัด') === person), [readings, person])

  async function deletePerson() {
    if (!person) return
    const ids = rows.map((r) => r.id)
    if (!ids.length) return
    if (!(await confirmDialog({ title: 'ลบข้อมูลผู้วัด', message: `ลบผลวัดของ "${person}" จำนวน ${ids.length} รายการ? การลบนี้ย้อนกลับไม่ได้`, danger: true, confirmText: 'ลบข้อมูล' }))) return
    const r = await fetch(`/api/dev/fat?ids=${encodeURIComponent(ids.join(','))}`, { method: 'DELETE' })
    if (r.ok) { setPerson(''); await load() }
    else alert('ลบไม่สำเร็จ (เฉพาะ super admin เท่านั้น)')
  }

  return (
    <div id="fatreport-wrap" className="p-4 sm:p-6 max-w-[900px] mx-auto flex flex-col gap-4">
      <style>{FAT_PRINT_CSS}</style>

      <div className="no-print flex items-center gap-3 flex-wrap">
        <a href="/dev/fat-test" className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← กลับเดชบอร์ด</a>
        <div className="flex-1" />
        <label className="text-[13px] text-[#5A6B82] font-semibold">ผู้วัด:</label>
        <select value={person} onChange={(e) => setPerson(e.target.value)} className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[var(--brand)] bg-white">
          {persons.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">↻ รีเฟรช</button>
        <button onClick={() => window.print()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">🖨️ ปริ้นรายงาน</button>
        {canDelete && person && <button onClick={deletePerson} className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#C13540] hover:border-[#C13540]">🗑️ ลบข้อมูลคนนี้</button>}
      </div>

      {!loaded ? <div className="text-center text-[#8492A6] py-10">กำลังโหลด…</div>
        : readings.length === 0 ? <div className="text-center text-[#8492A6] py-10">ยังไม่มีข้อมูลการวัด</div>
        : <FatReportBody person={person} rows={rows} />}
    </div>
  )
}
