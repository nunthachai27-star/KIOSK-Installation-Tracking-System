'use client'
import { useEffect, useMemo, useState } from 'react'
import { confirmDialog } from '@/lib/dialog'
import { downloadNodePng, downloadNodePdf } from '@/lib/exportReport'
import { BpReportBody, BP_PRINT_CSS, type Reading } from '@/components/bpReport'

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

  const ALL = '__ALL__'
  const personLabel = (p: string) => p === ALL ? 'ทุกคน (เทียบตามเวลา ไม่แยกชื่อ)' : p

  // เติมชื่อผู้วัดให้เรคคอร์ดที่ไม่มีชื่อ (เช่น Yuwell) จากเรคคอร์ดก่อนหน้าที่มีชื่อ ภายใน 15 นาที
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
      return { ...r, effName: eff || 'ไม่ระบุผู้วัด' }
    })
  }, [readings])

  const persons = useMemo(() => [ALL, ...Array.from(new Set(effRows.map((r) => r.effName)))], [effRows])
  useEffect(() => { if (!person && effRows.length) setPerson(effRows[effRows.length - 1].effName) }, [effRows, person])

  const rows = useMemo(() => effRows.filter((r) => person === ALL || r.effName === person), [effRows, person])

  async function deletePerson() {
    if (!person || person === ALL) return
    const ids = rows.map((r) => r.id)
    if (!ids.length) return
    if (!(await confirmDialog({ title: 'ลบข้อมูลผู้วัด', message: `ลบผลวัดความดันของ "${personLabel(person)}" จำนวน ${ids.length} รายการ? ย้อนกลับไม่ได้`, danger: true, confirmText: 'ลบข้อมูล' }))) return
    const r = await fetch(`/api/dev/bp?ids=${encodeURIComponent(ids.join(','))}`, { method: 'DELETE' })
    if (r.ok) { setPerson(''); await load() } else alert('ลบไม่สำเร็จ (เฉพาะ super admin)')
  }
  const safeName = (person === ALL ? 'ทุกเครื่อง' : person || 'bp-report').replace(/[\\/:*?"<>|]+/g, '_')
  async function dl(kind: 'png' | 'pdf') {
    setBusy(kind)
    try { kind === 'png' ? await downloadNodePng('bpreport', `รายงานความดัน-${safeName}`) : await downloadNodePdf('bpreport', `รายงานความดัน-${safeName}`) }
    catch { alert('บันทึกไม่สำเร็จ ลองใหม่') } finally { setBusy('') }
  }

  return (
    <div id="bpreport-wrap" className="p-4 sm:p-6 max-w-[920px] mx-auto flex flex-col gap-4">
      <style>{BP_PRINT_CSS}</style>

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
        : <BpReportBody person={personLabel(person)} rows={rows} byName={person !== ALL} />}
    </div>
  )
}
