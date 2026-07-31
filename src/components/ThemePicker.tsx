'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEMES } from '@/lib/themes'
import { alertDialog } from '@/lib/dialog'

// Pick a personal colour theme. Previews instantly by stamping data-theme on
// <html>; saves the choice to the user (per-user, no effect on others).
export function ThemePicker({ userId, current, onClose }: { userId: string; current: string | null; onClose: () => void }) {
  const router = useRouter()
  const orig = current || 'orange'
  const [sel, setSel] = useState(orig)
  const [busy, setBusy] = useState(false)

  function preview(key: string) {
    setSel(key)
    document.documentElement.dataset.theme = key
  }
  function cancel() {
    document.documentElement.dataset.theme = orig
    onClose()
  }
  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: sel }),
      })
      if (!res.ok) { await alertDialog('บันทึกธีมไม่สำเร็จ'); return }
      onClose(); router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[16px] font-bold text-[#1C1917]">🎨 ธีมสีเว็บ</div>
          <button type="button" onClick={cancel} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <p className="text-[12.5px] text-[#8492A6] mb-3">เลือกสีของคุณเอง (ไม่กระทบผู้ใช้อื่น) · แตะเพื่อดูตัวอย่างทันที</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {THEMES.map((t) => (
            <button key={t.key} onClick={() => preview(t.key)}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition ${sel === t.key ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#ECEFF3] hover:bg-[#F6F9FC]'}`}>
              <span className="w-7 h-7 rounded-lg shrink-0" style={{ background: t.swatch, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.5)' }} />
              <span className="text-[12.5px] font-semibold text-[#1C1917] leading-tight">{t.label}</span>
              {sel === t.key && <span className="ml-auto text-[var(--brand)] text-[13px] font-bold">✓</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy}
            className="bg-[var(--brand)] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {busy ? 'กำลังบันทึก…' : 'ใช้ธีมนี้'}
          </button>
          <button onClick={cancel} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
        </div>
      </div>
    </div>
  )
}
