'use client'
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog, promptDialog, alertDialog } from '@/lib/dialog'

type Folder = { id: string; name: string; count: number }
type FileRow = {
  id: string; name: string; ext: string | null; size: number; note: string | null
  folderId: string | null; downloads: number; createdAt: string; uploadedByName: string | null
}

const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (iso: string) => dFmt.format(new Date(iso))
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const iconOf = (ext: string | null) => {
  const e = (ext || '').toLowerCase()
  if (e === '.apk') return '📱'
  if (['.pdf'].includes(e)) return '📕'
  if (['.zip', '.rar', '.7z'].includes(e)) return '🗜️'
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(e)) return '🖼️'
  if (['.xls', '.xlsx', '.csv'].includes(e)) return '📊'
  if (['.doc', '.docx'].includes(e)) return '📝'
  return '📄'
}

export function FileVault({ folders, files }: { folders: Folder[]; files: FileRow[] }) {
  const router = useRouter()
  const [active, setActive] = useState<string>('ALL') // ALL | NONE | <folderId>
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [uploadFolder, setUploadFolder] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const shown = useMemo(() => files.filter((f) => {
    if (active === 'ALL') return true
    if (active === 'NONE') return !f.folderId
    return f.folderId === active
  }), [files, active])

  async function createFolder() {
    const nm = await promptDialog({ title: 'สร้างโฟลเดอร์', message: 'ชื่อโฟลเดอร์ (เช่น APK, คู่มือ, งานติดตั้ง)', confirmText: 'สร้าง' })
    if (!nm || !nm.trim()) return
    const res = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nm.trim() }) })
    if (res.ok) router.refresh()
    else await alertDialog('สร้างโฟลเดอร์ไม่สำเร็จ')
  }
  async function renameFolder(f: Folder) {
    const nm = await promptDialog({ title: 'เปลี่ยนชื่อโฟลเดอร์', message: 'ชื่อใหม่', defaultValue: f.name, confirmText: 'บันทึก' })
    if (!nm || !nm.trim() || nm.trim() === f.name) return
    const res = await fetch(`/api/folders/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nm.trim() }) })
    if (res.ok) router.refresh()
  }
  async function deleteFolder(f: Folder) {
    if (!(await confirmDialog({ title: 'ลบโฟลเดอร์', message: `ลบโฟลเดอร์ "${f.name}"?\nไฟล์ข้างในจะไม่ถูกลบ แต่จะย้ายไป "ไม่มีโฟลเดอร์"`, danger: true, confirmText: 'ลบ' }))) return
    const res = await fetch(`/api/folders/${f.id}`, { method: 'DELETE' })
    if (res.ok) { if (active === f.id) setActive('ALL'); router.refresh() }
  }
  async function deleteFile(f: FileRow) {
    if (!(await confirmDialog({ title: 'ลบไฟล์', message: `ลบ "${f.name}"?\nลบแล้วกู้คืนไม่ได้`, danger: true, confirmText: 'ลบ' }))) return
    const res = await fetch(`/api/vault/${f.id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else await alertDialog('ลบไม่สำเร็จ')
  }
  async function copyLink(f: FileRow) {
    const url = `${window.location.origin}/f/${f.id}`
    try { await navigator.clipboard.writeText(url); await alertDialog({ title: 'คัดลอกลิงก์แล้ว', message: url }) }
    catch { await alertDialog({ title: 'ลิงก์แชร์', message: url }) }
  }

  function pickFile(f: File | null) { setFile(f); if (f && !name) setName(f.name) }
  function resetUpload() { setFile(null); setName(''); setNote(''); setProgress(null); if (fileInput.current) fileInput.current.value = '' }

  function upload() {
    if (!file || progress !== null) return
    const params = new URLSearchParams()
    params.set('name', (name || file.name).trim())
    if (uploadFolder) params.set('folderId', uploadFolder)
    if (note.trim()) params.set('note', note.trim())
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/vault?${params.toString()}`)
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name))
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      setProgress(null)
      if (xhr.status >= 200 && xhr.status < 300) { resetUpload(); setShowUpload(false); router.refresh() }
      else { let m = 'อัปโหลดไม่สำเร็จ'; try { m = JSON.parse(xhr.responseText)?.message || m } catch {}; alertDialog(m) }
    }
    xhr.onerror = () => { setProgress(null); alertDialog('อัปโหลดไม่สำเร็จ (การเชื่อมต่อ/ขนาดไฟล์)') }
    setProgress(0)
    xhr.send(file)
  }

  const activeFolder = folders.find((f) => f.id === active) || null

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#1C1917]">📁 ไฟล์ทีม</span>
          <span className="text-[12px] text-[#8492A6]">{files.length} ไฟล์</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createFolder} className="text-[12.5px] font-semibold rounded-lg px-3 py-1.5 border border-[#D6DFEA] text-[#5A6B82] bg-white hover:bg-[#F6F9FC]">＋ โฟลเดอร์</button>
          <button onClick={() => { setUploadFolder(active !== 'ALL' && active !== 'NONE' ? active : ''); setShowUpload((v) => !v) }}
            className="text-[12.5px] font-semibold rounded-lg px-3 py-1.5 bg-[#EA580C] text-white hover:bg-[#C2410C]">⬆️ อัปโหลดไฟล์</button>
        </div>
      </div>

      {/* folder tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {([['ALL', `ทั้งหมด (${files.length})`], ['NONE', `ไม่มีโฟลเดอร์ (${files.filter((f) => !f.folderId).length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setActive(k)}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold border ${active === k ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>{label}</button>
        ))}
        {folders.map((f) => (
          <button key={f.id} onClick={() => setActive(f.id)}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold border ${active === f.id ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>📁 {f.name} ({f.count})</button>
        ))}
      </div>

      {activeFolder && (
        <div className="flex items-center gap-3 mb-2 text-[12px]">
          <button onClick={() => renameFolder(activeFolder)} className="text-[#1B5FD9] hover:underline">เปลี่ยนชื่อโฟลเดอร์</button>
          <button onClick={() => deleteFolder(activeFolder)} className="text-[#C13540] hover:underline">ลบโฟลเดอร์</button>
        </div>
      )}

      {showUpload && (
        <div className="rounded-xl bg-[#FBFAF8] border border-[#EEEAE6] p-3 mb-3 flex flex-col gap-2.5">
          <input ref={fileInput} type="file" onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EA580C] file:text-white file:px-3 file:py-1.5 file:font-semibold file:text-[12.5px]" />
          {file && <div className="text-[12px] text-[#5A6B82]">เลือก: {file.name} · {fmtSize(file.size)}{file.size > 500 * 1048576 ? ' — ⚠️ เกิน 500 MB' : ''}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อที่แสดง (เว้นว่าง = ชื่อไฟล์)"
              className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#EA580C]" />
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}
              className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#EA580C]">
              <option value="">— ไม่มีโฟลเดอร์ —</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ / เวอร์ชัน (ไม่บังคับ)"
            className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#EA580C]" />
          {progress !== null && (
            <div className="h-2 rounded-full bg-[#EEEAE6] overflow-hidden"><div className="h-full bg-[#EA580C] transition-all" style={{ width: `${progress}%` }} /></div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={upload} disabled={!file || progress !== null || (!!file && file.size > 500 * 1048576)}
              className="bg-[#EA580C] text-white text-[12.5px] font-semibold rounded-lg px-4 py-2 hover:bg-[#C2410C] disabled:opacity-50">
              {progress !== null ? `กำลังอัป… ${progress}%` : 'อัปโหลด'}
            </button>
            <button onClick={() => { resetUpload(); setShowUpload(false) }} disabled={progress !== null}
              className="text-[12.5px] text-[#5A6B82] rounded-lg px-3 py-2 hover:bg-[#F0EEEC] disabled:opacity-50">ยกเลิก</button>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="text-center text-[13px] text-[#8492A6] py-8">ยังไม่มีไฟล์{active !== 'ALL' ? 'ในส่วนนี้' : ''} — กด “อัปโหลดไฟล์” เพื่อเริ่ม</div>
      ) : (
        <div className="flex flex-col divide-y divide-[#F4F7FB]">
          {shown.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-2">
              <span className="text-[20px] shrink-0">{iconOf(f.ext)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-[#1C1917] truncate">{f.name}</div>
                <div className="text-[11.5px] text-[#8492A6]">
                  {f.ext ? f.ext.replace('.', '').toUpperCase() + ' · ' : ''}{fmtSize(f.size)} · {fmt(f.createdAt)}
                  {f.uploadedByName ? ` · ${f.uploadedByName}` : ''} · ⬇️ {f.downloads}
                  {f.note ? ` · ${f.note}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`/api/download/${f.id}`} download title="ดาวน์โหลด"
                  className="text-[12px] font-semibold text-[#157F4C] rounded-lg px-2.5 py-1.5 hover:bg-[#E7F6EC]">⬇️</a>
                <button onClick={() => copyLink(f)} title="คัดลอกลิงก์แชร์"
                  className="text-[12px] font-semibold text-[#1B5FD9] rounded-lg px-2.5 py-1.5 hover:bg-[#EEF3FA]">🔗</button>
                <button onClick={() => deleteFile(f)} title="ลบ"
                  className="text-[12px] text-[#C13540] rounded-lg px-2.5 py-1.5 hover:bg-[#FBE4E4]">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
