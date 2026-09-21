'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

type MFile = { id: string; fileName: string; fileType: string; fileSize: number }
type Manual = { id: string; title: string; description: string | null; category: string | null; linkUrl: string | null; token: string; files: MFile[]; url: string; qr: string }

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`)
const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[var(--brand)]'

export function ManualManager({ initial }: { initial: Manual[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('')
  const [link, setLink] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const addFileRef = useRef<HTMLInputElement>(null)
  const [addFileCount, setAddFileCount] = useState(0)

  async function add() {
    const t = title.trim()
    if (!t) return
    setAdding(true)
    try {
      const r = await fetch('/api/manuals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, description: desc || null, category: cat || null, linkUrl: link || null }) })
      if (!r.ok) return
      const created = await r.json().catch(() => null)
      // อัปโหลดไฟล์ที่แนบมาตอนสร้าง (ถ้ามี)
      const files = addFileRef.current?.files
      if (created?.id && files?.length) {
        const fd = new FormData()
        for (const f of Array.from(files)) fd.append('file', f)
        await fetch(`/api/manuals/${created.id}/files`, { method: 'POST', body: fd }).catch(() => {})
      }
      setTitle(''); setDesc(''); setCat(''); setLink('')
      if (addFileRef.current) addFileRef.current.value = ''
      setAddFileCount(0)
      router.refresh()
    } finally { setAdding(false) }
  }

  async function del(m: Manual) {
    if (!(await confirmDialog({ title: 'ลบคู่มือ', message: `ลบ "${m.title}" และไฟล์ทั้งหมด?`, danger: true, confirmText: 'ลบ' }))) return
    const r = await fetch(`/api/manuals/${m.id}`, { method: 'DELETE' })
    if (r.ok) router.refresh()
  }

  async function upload(m: Manual, files: FileList | null) {
    if (!files?.length) return
    setBusy(m.id)
    try {
      const fd = new FormData()
      for (const f of Array.from(files)) fd.append('file', f)
      const r = await fetch(`/api/manuals/${m.id}/files`, { method: 'POST', body: fd })
      if (r.ok) router.refresh()
    } finally { setBusy('') }
  }

  async function delFile(m: Manual, fileId: string) {
    if (!(await confirmDialog({ title: 'ลบไฟล์', message: 'ลบไฟล์นี้ออกจากคู่มือ?', danger: true, confirmText: 'ลบ' }))) return
    const r = await fetch(`/api/manuals/${m.id}/files/${fileId}`, { method: 'DELETE' })
    if (r.ok) router.refresh()
  }

  function copy(m: Manual) {
    navigator.clipboard?.writeText(m.url).then(() => { setCopied(m.id); setTimeout(() => setCopied(''), 2000) }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-4">
      {/* เพิ่มคู่มือใหม่ */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
        <div className="text-[13px] font-bold text-[#233047] mb-3">➕ เพิ่มคู่มือใหม่</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อคู่มือ *" className={field} />
          <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="หมวดหมู่ (ถ้ามี)" className={field} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="คำอธิบาย (ถ้ามี)" rows={2} className={`${field} sm:col-span-2`} />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="ลิงก์ภายนอก (ถ้าไม่อัปโหลดไฟล์ เช่น https://...)" className={`${field} sm:col-span-2`} />
          <label className="sm:col-span-2 flex items-center gap-2 flex-wrap text-[13px] border border-dashed border-[#C3D0E0] rounded-lg px-3 py-2.5 text-[#3C4A5E]">
            <span className="font-semibold">📎 แนบไฟล์ (PDF/รูป):</span>
            <input ref={addFileRef} type="file" multiple accept=".pdf,image/*" onChange={(e) => setAddFileCount(e.target.files?.length || 0)} className="text-[12.5px]" />
            {addFileCount > 0 && <span className="text-[#157F4C] font-semibold">เลือกแล้ว {addFileCount} ไฟล์</span>}
          </label>
        </div>
        <button onClick={add} disabled={adding || !title.trim()} className="mt-3 bg-[var(--brand)] text-white text-[13px] font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
          {adding ? 'กำลังเพิ่ม/อัปโหลด…' : 'เพิ่มคู่มือ'}
        </button>
        <p className="text-[11.5px] text-[#96A2B5] mt-2">แนบไฟล์ตอนสร้างได้เลย (หรือเพิ่มทีหลังในการ์ดคู่มือก็ได้) · ลิงก์/QR สำหรับสาธารณะจะสร้างให้อัตโนมัติ</p>
      </div>

      {initial.length === 0 && <div className="text-center text-[#8492A6] py-8">ยังไม่มีคู่มือ — เพิ่มด้านบนได้เลย</div>}

      {initial.map((m) => (
        <div key={m.id} className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              {m.category && <div className="text-[11.5px] font-semibold text-[#7A44C6] mb-0.5">{m.category}</div>}
              <div className="text-[15px] font-bold text-[#1C1917]">{m.title}</div>
              {m.description && <div className="text-[12.5px] text-[#5A6B82] mt-1 whitespace-pre-line">{m.description}</div>}
              {m.linkUrl && <a href={m.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-[var(--brand)] hover:underline mt-1 inline-block break-all">🔗 {m.linkUrl}</a>}

              {/* ลิงก์สาธารณะ */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code className="text-[12px] bg-[#F6F8FB] border border-[#E7EDF4] rounded-lg px-2.5 py-1.5 text-[#1C1917] break-all select-all">{m.url}</code>
                <button onClick={() => copy(m)} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">{copied === m.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}</button>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">↗ เปิด</a>
                <button onClick={() => del(m)} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#C13540] hover:border-[#C13540]">🗑️ ลบคู่มือ</button>
              </div>

              {/* ไฟล์ */}
              <div className="mt-3">
                <div className="text-[12px] font-semibold text-[#5A6B82] mb-1.5">ไฟล์ ({m.files.length})</div>
                <div className="flex flex-col gap-1.5">
                  {m.files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 bg-[#FAFBFD] border border-[#EEF2F8] rounded-lg px-3 py-1.5">
                      <a href={`/api/manual-file/${f.id}`} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-[#233047] hover:text-[var(--brand)] break-all">📄 {f.fileName} <span className="text-[#A8A29E]">· {fmtSize(f.fileSize)}</span></a>
                      <button onClick={() => delFile(m, f.id)} className="text-[12px] text-[#C13540] hover:underline shrink-0">ลบ</button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold px-3 py-2 rounded-lg border border-dashed border-[#C3D0E0] text-[#3C4A5E] hover:border-[var(--brand)] cursor-pointer">
                  {busy === m.id ? 'กำลังอัปโหลด…' : '＋ อัปโหลดไฟล์ (PDF/รูป)'}
                  <input type="file" multiple className="hidden" disabled={busy === m.id} onChange={(e) => { upload(m, e.target.files); e.target.value = '' }} />
                </label>
              </div>
            </div>

            {/* QR */}
            {m.qr && (
              <div className="text-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.qr} alt={`QR ${m.title}`} width={110} height={110} className="rounded-lg border border-[#E7EDF4]" />
                <div className="text-[11px] text-[#8492A6] mt-1">สแกนดูคู่มือ</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
