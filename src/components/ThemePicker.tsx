'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { THEMES, BACKGROUNDS } from '@/lib/themes'
import { alertDialog } from '@/lib/dialog'
import { CRITTER_KEY, CRITTER_EVENT } from '@/components/RunningCritter'

// Pick a personal colour theme + background style. Previews instantly by stamping
// data-theme / data-bg on <html>; saves per-user (no effect on others).
export function ThemePicker({ userId, current, currentBg, onClose }: { userId: string; current: string | null; currentBg: string | null; onClose: () => void }) {
  const router = useRouter()
  const origT = current || 'orange'
  const origBg = currentBg || 'plain'
  const [sel, setSel] = useState(origT)
  const [selBg, setSelBg] = useState(origBg)
  const [busy, setBusy] = useState(false)
  const [critter, setCritter] = useState(true)
  useEffect(() => { try { setCritter(localStorage.getItem(CRITTER_KEY) !== 'off') } catch {} }, [])
  function toggleCritter(next: boolean) {
    setCritter(next)
    try { localStorage.setItem(CRITTER_KEY, next ? 'on' : 'off') } catch {}
    window.dispatchEvent(new Event(CRITTER_EVENT)) // มีผลทันที ไม่ต้องกดบันทึก
  }

  function previewTheme(key: string) { setSel(key); document.documentElement.dataset.theme = key }
  function previewBg(key: string) { setSelBg(key); document.documentElement.dataset.bg = key }
  function cancel() {
    document.documentElement.dataset.theme = origT
    document.documentElement.dataset.bg = origBg
    onClose()
  }
  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: sel, bg: selBg }),
      })
      if (!res.ok) { await alertDialog('บันทึกไม่สำเร็จ'); return }
      onClose(); router.refresh()
    } finally { setBusy(false) }
  }

  const modal = (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[16px] font-bold text-[#1C1917]">🎨 ธีมสีเว็บ</div>
          <button type="button" onClick={cancel} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <p className="text-[12.5px] text-[#8492A6] mb-3">เลือกของคุณเอง (ไม่กระทบผู้ใช้อื่น) · แตะเพื่อดูตัวอย่างทันที</p>

        <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1.5">สีธีม</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {THEMES.map((t) => (
            <button key={t.key} onClick={() => previewTheme(t.key)}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition ${sel === t.key ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#ECEFF3] hover:bg-[#F6F9FC]'}`}>
              <span className="w-7 h-7 rounded-lg shrink-0" style={{ background: t.swatch, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.5)' }} />
              <span className="text-[12.5px] font-semibold text-[#1C1917] leading-tight">{t.label}</span>
              {sel === t.key && <span className="ml-auto text-[var(--brand)] text-[13px] font-bold">✓</span>}
            </button>
          ))}
        </div>

        <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1.5">พื้นหลัง</div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {BACKGROUNDS.map((b) => (
            <button key={b.key} onClick={() => previewBg(b.key)}
              className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${selBg === b.key ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#ECEFF3] hover:bg-[#F6F9FC]'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold text-[#1C1917]">{b.label}</span>
                {selBg === b.key && <span className="ml-auto text-[var(--brand)] text-[13px] font-bold">✓</span>}
              </div>
              <div className="text-[11px] text-[#8492A6] mt-0.5">{b.hint}</div>
            </button>
          ))}
        </div>

        <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-1.5">ลูกเล่น</div>
        <button type="button" onClick={() => toggleCritter(!critter)}
          className="w-full flex items-center gap-2.5 rounded-xl border-2 border-[#ECEFF3] px-3 py-2.5 mb-5 text-left hover:bg-[#F6F9FC]">
          <span className="text-[20px]">🐾</span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-[#1C1917]">สัตว์วิ่งบนหน้าเว็บ</span>
            <span className="block text-[11px] text-[#8492A6]">มีผลทันที · เฉพาะเครื่องนี้</span>
          </span>
          <span className={`ml-auto relative w-11 h-6 rounded-full transition-colors shrink-0 ${critter ? 'bg-[var(--brand)]' : 'bg-[#D6DFEA]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${critter ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy}
            className="bg-[var(--brand)] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <button onClick={cancel} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
        </div>
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
