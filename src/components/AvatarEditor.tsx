'use client'
import { useState } from 'react'
import { Avatar, AVATAR_ICONS, AVATAR_COLORS, type AvatarData } from './Avatar'
import { alertDialog } from '@/lib/dialog'

// Resize/crop an image file to a small square JPEG data URL (keeps the DB tiny).
async function fileToAvatar(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(new Error('read')); r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = dataUrl
  })
  const S = 256
  const c = document.createElement('canvas'); c.width = S; c.height = S
  const ctx = c.getContext('2d')
  if (!ctx) return dataUrl
  const scale = Math.max(S / img.width, S / img.height)
  const w = img.width * scale, h = img.height * scale
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
  return c.toDataURL('image/jpeg', 0.85)
}

export function AvatarEditor({ userId, name, current, onClose, onSaved }: {
  userId: string; name: string; current: AvatarData; onClose: () => void; onSaved: () => void
}) {
  const [url, setUrl] = useState<string | null>(current.avatarUrl ?? null)
  const [icon, setIcon] = useState<string | null>(current.avatarIcon ?? null)
  const [color, setColor] = useState<string>(current.avatarColor ?? AVATAR_COLORS[0])
  const [busy, setBusy] = useState(false)

  async function pickFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) { await alertDialog('เลือกไฟล์รูปภาพเท่านั้น'); return }
    try { const d = await fileToAvatar(file); setUrl(d); setIcon(null) }
    catch { await alertDialog('อ่านรูปไม่สำเร็จ') }
  }
  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url, avatarIcon: url ? null : icon, avatarColor: color }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); await alertDialog(d?.message || 'บันทึกไม่สำเร็จ'); return }
      onSaved()
    } finally { setBusy(false) }
  }

  const preview: AvatarData = { name, avatarUrl: url, avatarIcon: url ? null : icon, avatarColor: color }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-[#1C1917]">รูปโปรไฟล์</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Avatar user={preview} size={64} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-[var(--brand)] hover:underline cursor-pointer">
              ⬆️ อัปโหลดรูป
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
            {(url || icon) && (
              <button onClick={() => { setUrl(null); setIcon(null) }} className="text-[12px] text-[#5A6B82] hover:text-[#C13540] text-left">↺ ใช้ตัวอักษรย่อ</button>
            )}
          </div>
        </div>

        <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1.5">หรือเลือกไอคอน</div>
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {AVATAR_ICONS.map((ic) => (
            <button key={ic} onClick={() => { setIcon(ic); setUrl(null) }}
              className={`aspect-square rounded-lg text-[18px] grid place-items-center border ${icon === ic && !url ? 'border-[var(--brand)] bg-[#FFF3EC]' : 'border-[#ECEFF3] hover:bg-[#F6F9FC]'}`}>{ic}</button>
          ))}
        </div>

        <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1.5">สีพื้นหลัง (ไอคอน/ตัวอักษร)</div>
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-[#1C1917]' : ''}`} style={{ background: c }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy}
            className="bg-[var(--brand)] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <button onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
        </div>
      </div>
    </div>
  )
}
