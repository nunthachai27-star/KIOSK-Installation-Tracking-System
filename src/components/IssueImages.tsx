'use client'
import { useEffect, useRef, useState } from 'react'
import { enhanceImage } from '@/lib/enhanceImage'

type Img = { id: string; fileName: string; fileType: string; fileSize: number; uploadedAt: string; category: string | null }

const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

// ประเภทรูปเคลม — คงที่ 2 แบบ
const CATS = [
  { key: 'ส่งเคลม', label: 'ของส่งเคลม', color: '#B45309' },
  { key: 'รับคืน', label: 'ของรับคืน', color: '#0F766E' },
] as const
const catOf = (c: string | null) => (c === 'รับคืน' ? CATS[1] : CATS[0])

export function IssueImages({ issueId }: { issueId: string }) {
  const [imgs, setImgs] = useState<Img[]>([])
  const [cat, setCat] = useState<string>(CATS[0].key)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [enhance, setEnhance] = useState(true)
  const [err, setErr] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/issues/${issueId}/images`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((j) => { if (alive) setImgs(j.images ?? []) })
      .catch(() => {})
    return () => { alive = false }
  }, [issueId])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setErr('')
    try {
      for (const raw of Array.from(files)) {
        let f = raw
        if (enhance && raw.type.startsWith('image/')) {
          setPhase('กำลังปรับความชัด…')
          f = await enhanceImage(raw)
        }
        setPhase('กำลังอัปโหลด…')
        const fd = new FormData()
        fd.append('file', f)
        fd.append('category', cat)
        const r = await fetch(`/api/issues/${issueId}/images`, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (r.ok) setImgs((p) => [j.image, ...p])
        else setErr(j.message || 'อัปโหลดไม่สำเร็จ')
      }
    } finally { setBusy(false); setPhase('') }
  }
  async function del(id: string) {
    if (!confirm('ลบรูปนี้?')) return
    const r = await fetch(`/api/issues/${issueId}/images/${id}`, { method: 'DELETE' })
    if (r.ok) setImgs((p) => p.filter((d) => d.id !== id))
  }

  function Grid({ list }: { list: Img[] }) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {list.map((d) => {
          const c = catOf(d.category)
          return (
            <div key={d.id} className="relative rounded-lg border border-[#ECE8E3] bg-white overflow-hidden">
              <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="block">
                <img src={`/api/files/${d.id}`} alt={d.fileName} loading="lazy" className="w-full h-24 object-cover" />
              </a>
              <div className="px-1.5 py-1 flex items-center justify-between gap-1">
                <span className="text-[9.5px] font-bold px-1 py-0.5 rounded" style={{ color: c.color, background: `${c.color}18` }}>{c.label}</span>
                <span className="text-[10px] text-[#96A2B5]">{fmtSize(d.fileSize)}</span>
              </div>
              <a href={`/api/files/${d.id}?dl=1`} download={d.fileName} title="ดาวน์โหลด"
                className="absolute top-1 left-1 w-6 h-6 grid place-items-center rounded-md bg-[rgba(15,22,33,0.6)] text-white text-[12px] hover:bg-[var(--brand)]">⬇</a>
              <button type="button" onClick={() => del(d.id)} title="ลบ"
                className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-md bg-[rgba(15,22,33,0.6)] text-white text-[11px] hover:bg-[#C13540]">✕</button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl bg-[#FBFAF8] border border-[#EEEAE6] px-3 py-2.5">
      <div className="text-[12.5px] font-bold text-[#57534E] mb-1">🖼️ รูปอุปกรณ์ที่เคลม ({imgs.length})</div>
      <p className="text-[11.5px] text-[#8492A6] mb-2">เลือกประเภทก่อน แล้วถ่ายรูป/เลือกไฟล์ (PNG/JPG/WebP) ไม่เกิน 15MB</p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold text-[#5A6B82]">ประเภท:</span>
        {CATS.map((c) => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border ${cat === c.key ? 'text-white' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}
            style={cat === c.key ? { background: c.color, borderColor: c.color } : undefined}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button type="button" disabled={busy} onClick={() => camRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
          📷 ถ่ายรูป
        </button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60">
          📎 เลือกไฟล์รูป
        </button>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-[#5A6B82] cursor-pointer select-none">
          <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="accent-[var(--brand)]" />
          ✨ ปรับความชัดอัตโนมัติ
        </label>
        {busy && <span className="text-[12px] text-[var(--brand)] font-semibold">{phase || 'กำลังทำงาน…'}</span>}
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
          onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </div>
      {err && <div className="text-[12px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2 mb-2">{err}</div>}

      {imgs.length === 0 ? (
        <div className="text-[12px] text-[#96A2B5] rounded-xl border border-dashed border-[#DCE4EE] px-4 py-5 text-center">ยังไม่มีรูปแนบ</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {CATS.map((c) => {
            const list = imgs.filter((d) => catOf(d.category).key === c.key)
            if (!list.length) return null
            return (
              <div key={c.key}>
                <div className="text-[11.5px] font-bold mb-1" style={{ color: c.color }}>{c.label} ({list.length})</div>
                <Grid list={list} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
