'use client'
import { useEffect, useRef, useState } from 'react'

// A drop-in replacement for <input type="date"> that ALWAYS shows/accepts d/m/yyyy
// (CE), regardless of the browser locale, while still storing/emitting ISO
// (yyyy-mm-dd) exactly like the native input — so existing data is unaffected.
// A calendar button opens the native picker for convenience.
const toDisplay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
const toIso = (text: string): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
  if (!m) return null
  const d = +m[1], mo = +m[2], y = +m[3]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt = new Date(`${iso}T00:00:00Z`)
  if (isNaN(dt.getTime()) || dt.getUTCDate() !== d || dt.getUTCMonth() + 1 !== mo) return null
  return iso
}

export function DateField({ value, onChange, className = '', min, max, placeholder = 'วว/ดด/ปปปป', ...rest }: {
  value: string
  onChange: (iso: string) => void
  className?: string
  min?: string
  max?: string
  placeholder?: string
  'aria-label'?: string
}) {
  const [text, setText] = useState(toDisplay(value))
  // Keep the visible text in sync when the value changes from outside (reset, autofill).
  useEffect(() => { setText(toDisplay(value)) }, [value])
  const nativeRef = useRef<HTMLInputElement>(null)

  function onText(v: string) {
    setText(v)
    if (v.trim() === '') { onChange(''); return }
    const iso = toIso(v)
    if (iso) onChange(iso)
  }
  function onBlur() {
    // Revert an unparseable entry back to the last good value.
    if (text.trim() !== '' && !toIso(text)) setText(toDisplay(value))
  }
  function openPicker() {
    const el = nativeRef.current
    if (!el) return
    const withPicker = el as HTMLInputElement & { showPicker?: () => void }
    if (typeof withPicker.showPicker === 'function') { try { withPicker.showPicker() } catch { el.focus() } }
    else el.focus()
  }

  return (
    <div className="relative">
      <input type="text" inputMode="numeric" value={text} placeholder={placeholder}
        onChange={(e) => onText(e.target.value)} onBlur={onBlur}
        className={`${className} pr-8`} {...rest} />
      <button type="button" onClick={openPicker} tabIndex={-1} aria-label="เปิดปฏิทิน"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[13px] leading-none text-[#8492A6] hover:text-[var(--brand)]">📅</button>
      {/* Hidden native picker — opened programmatically; still stores ISO. */}
      <input ref={nativeRef} type="date" value={value || ''} min={min} max={max} tabIndex={-1} aria-hidden="true"
        onChange={(e) => { onChange(e.target.value); setText(toDisplay(e.target.value)) }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 pointer-events-none" />
    </div>
  )
}
