'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'

// In-app replacement for window.confirm / prompt / alert — a single modal driven
// by a tiny external store, exposed as promise-based helpers so call sites read
// almost the same as the native ones (just awaited).
type Kind = 'confirm' | 'prompt' | 'alert'
export type DialogOptions = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean       // red confirm button (destructive actions)
  defaultValue?: string  // prompt initial value
  placeholder?: string
  multiline?: boolean     // prompt: textarea instead of input
}
type DialogReq = DialogOptions & { id: number; kind: Kind; resolve: (v: unknown) => void }

let current: DialogReq | null = null
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const getSnapshot = () => current

function push(kind: Kind, opts: DialogOptions): Promise<unknown> {
  return new Promise((resolve) => {
    // Never stack: if a dialog is already open, dismiss it (cancel) first.
    if (current) current.resolve(current.kind === 'prompt' ? null : current.kind === 'alert' ? undefined : false)
    current = { ...opts, id: ++seq, kind, resolve }
    emit()
  })
}
function settle(value: unknown) {
  const c = current
  current = null
  emit()
  c?.resolve(value)
}

export function confirmDialog(opts: DialogOptions | string): Promise<boolean> {
  return push('confirm', typeof opts === 'string' ? { message: opts } : opts) as Promise<boolean>
}
export function promptDialog(opts: DialogOptions | string): Promise<string | null> {
  return push('prompt', typeof opts === 'string' ? { message: opts } : opts) as Promise<string | null>
}
export function alertDialog(opts: DialogOptions | string): Promise<void> {
  return push('alert', typeof opts === 'string' ? { message: opts } : opts) as Promise<void>
}

export function DialogHost() {
  const d = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const [val, setVal] = useState('')
  useEffect(() => { setVal(d?.defaultValue ?? '') }, [d?.id, d?.defaultValue])

  useEffect(() => {
    if (!d) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel() }
      else if (e.key === 'Enter' && (d.kind !== 'prompt' || !d.multiline)) { e.preventDefault(); ok() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id, val])

  if (!d) return null
  const isPrompt = d.kind === 'prompt'
  const isAlert = d.kind === 'alert'
  function ok() { settle(isPrompt ? val : isAlert ? undefined : true) }
  function cancel() { settle(isPrompt ? null : isAlert ? undefined : false) }

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}>
      <div className="mt-[15vh] w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        role="dialog" aria-modal="true">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className={`w-9 h-9 shrink-0 rounded-full grid place-items-center text-[16px] ${d.danger ? 'bg-[#FBE4E4] text-[#C13540]' : isAlert ? 'bg-[#FEF0E6] text-[#EA580C]' : 'bg-[#EEF3FA] text-[#1B5FD9]'}`}>
              {d.danger ? '🗑️' : isAlert ? '⚠️' : '❓'}
            </span>
            <div className="min-w-0 flex-1">
              {d.title && <div className="text-[15px] font-bold text-[#1C1917] mb-0.5">{d.title}</div>}
              {d.message && <div className="text-[13.5px] text-[#5A6B82] whitespace-pre-line leading-relaxed">{d.message}</div>}
            </div>
          </div>

          {isPrompt && (
            d.multiline ? (
              <textarea autoFocus value={val} onChange={(e) => setVal(e.target.value)} rows={3} placeholder={d.placeholder}
                className="mt-3 w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 resize-none" />
            ) : (
              <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={d.placeholder}
                className="mt-3 w-full border border-[#D6DFEA] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15" />
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[#FBFAF8] border-t border-[#F1F3F6]">
          {!isAlert && (
            <button onClick={cancel} className="text-[13px] font-semibold text-[#5A6B82] rounded-lg px-4 py-2 hover:bg-[#F0EEEC]">
              {d.cancelText || 'ยกเลิก'}
            </button>
          )}
          <button onClick={ok} autoFocus={isAlert}
            className={`text-[13px] font-semibold text-white rounded-lg px-4 py-2 ${d.danger ? 'bg-[#C13540] hover:bg-[#A62A33]' : 'bg-[#EA580C] hover:bg-[#C2410C]'}`}>
            {d.confirmText || (isAlert ? 'รับทราบ' : isPrompt ? 'ตกลง' : 'ยืนยัน')}
          </button>
        </div>
      </div>
    </div>
  )
}
