'use client'
import { useEffect, useRef, useState } from 'react'
import { enhanceImage } from '@/lib/enhanceImage'

type Doc = { id: string; fileName: string; fileType: string; category: string | null; fileSize: number; uploadedAt: string }

// ชนิดเอกสารเริ่มต้น (ถ้ายังไม่ได้ตั้งค่า) — จริง ๆ ดึงจากตั้งค่า › ชนิดเอกสารงาน
const DEFAULT_CATS = ['สัญญา / PO', 'ใบเสนอราคา', 'ใบส่งของ', 'ใบเสร็จ/ภาษี', 'อื่นๆ']
// รองรับค่าคีย์เดิม (ก่อนเปลี่ยนมาเก็บเป็นชื่อไทย)
const LEGACY: Record<string, string> = { contract: 'สัญญา / PO', quotation: 'ใบเสนอราคา', delivery: 'ใบส่งของ', receipt: 'ใบเสร็จ/ภาษี', other: 'อื่นๆ' }
const catLabel = (c: string | null) => (c ? (LEGACY[c] ?? c) : 'อื่นๆ')
const isImage = (t: string) => t.startsWith('image/')
const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export function JobDocuments({ jobId }: { jobId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [cats, setCats] = useState<string[]>(DEFAULT_CATS)
  const [cat, setCat] = useState(DEFAULT_CATS[0])
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [enhance, setEnhance] = useState(true)
  const [err, setErr] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/jobs/${jobId}/documents`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((j) => { if (alive) setDocs(j.documents ?? []) })
      .catch(() => {})
    // ดึงชนิดเอกสารที่ตั้งค่าไว้ (แก้ได้ที่ ตั้งค่า › ชนิดเอกสารงาน)
    fetch('/api/settings/options?category=JOB_DOC_TYPE', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: { value: string; active: boolean }[]) => {
        if (!alive) return
        const vals = (items || []).filter((i) => i.active).map((i) => i.value)
        if (vals.length) { setCats(vals); setCat(vals[0]) }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [jobId])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setErr('')
    try {
      for (const raw of Array.from(files)) {
        let f = raw
        if (enhance && raw.type.startsWith('image/')) {
          setPhase('กำลังสแกน/ปรับความชัด…')
          f = await enhanceImage(raw)
        }
        setPhase('กำลังอัปโหลด…')
        const fd = new FormData()
        fd.append('file', f)
        fd.append('category', cat)
        const r = await fetch(`/api/jobs/${jobId}/documents`, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (r.ok) setDocs((p) => [j.document, ...p])
        else setErr(j.message || 'อัปโหลดไม่สำเร็จ')
      }
    } finally { setBusy(false); setPhase('') }
  }
  async function del(id: string) {
    if (!confirm('ลบเอกสารนี้?')) return
    const r = await fetch(`/api/jobs/${jobId}/documents/${id}`, { method: 'DELETE' })
    if (r.ok) setDocs((p) => p.filter((d) => d.id !== id))
  }

  return (
    <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
      <div className="text-[15px] font-bold mb-1">📄 เอกสารงาน</div>
      <p className="text-[12.5px] text-[#8492A6] mb-3">แนบสัญญา/PO, ใบเสนอราคา, ใบส่งของ ฯลฯ — ถ่ายรูปจากมือถือ หรือเลือกไฟล์รูป/PDF</p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12.5px] font-semibold text-[#5A6B82]">ชนิดเอกสาร:</span>
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)}
            className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${cat === c ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
            {c}
          </button>
        ))}
        <a href="/settings/JOB_DOC_TYPE" target="_blank" rel="noopener" className="text-[11.5px] text-[#8492A6] underline hover:text-[var(--brand)]">แก้ไขชนิด</a>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" disabled={busy} onClick={() => camRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
          📷 ถ่ายรูปเอกสาร
        </button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60">
          📎 เลือกไฟล์ (รูป / PDF)
        </button>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-[#5A6B82] cursor-pointer select-none">
          <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="accent-[var(--brand)]" />
          ✨ สแกน/ปรับความชัดอัตโนมัติ
        </label>
        {busy && <span className="text-[12.5px] text-[var(--brand)] font-semibold">{phase || 'กำลังทำงาน…'}</span>}
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple hidden
          onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </div>
      {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2 mb-3">{err}</div>}

      {docs.length === 0 ? (
        <div className="text-[12.5px] text-[#96A2B5] rounded-xl border border-dashed border-[#DCE4EE] px-4 py-6 text-center">ยังไม่มีเอกสารแนบ</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {docs.map((d) => (
            <div key={d.id} className="relative rounded-xl border border-[#ECE8E3] bg-[#FBFAF8] overflow-hidden">
              <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="block">
                {isImage(d.fileType) ? (
                  <img src={`/api/files/${d.id}`} alt={d.fileName} loading="lazy" className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 grid place-items-center bg-[#F1F3F6] text-[26px]">📄</div>
                )}
              </a>
              <div className="p-2">
                <div className="text-[10.5px] font-bold text-[var(--brand)] mb-0.5">{catLabel(d.category)}</div>
                <div className="text-[11px] text-[#3C4A5E] truncate" title={d.fileName}>{d.fileName}</div>
                <div className="text-[10px] text-[#96A2B5]">{fmtSize(d.fileSize)}</div>
              </div>
              <button type="button" onClick={() => del(d.id)} title="ลบ"
                className="absolute top-1.5 right-1.5 w-6 h-6 grid place-items-center rounded-md bg-[rgba(15,22,33,0.6)] text-white text-[11px] hover:bg-[#C13540]">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
