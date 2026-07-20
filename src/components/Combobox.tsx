'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

export type ComboOption = { id: string; label: string; sub?: string }

/** Searchable select: type to filter, click / Enter to choose. */
export function Combobox({
  value,
  options,
  onChange,
  placeholder = 'พิมพ์เพื่อค้นหา…',
  onCreate,
  createLabel = (q) => `+ เพิ่ม "${q}"`,
  limit = 50,
}: {
  value: string
  options: ComboOption[]
  onChange: (id: string) => void
  placeholder?: string
  // When provided and the query matches no existing option, offer to create it.
  // Should perform the creation (incl. selecting it) and resolve — return value ignored.
  onCreate?: (query: string) => Promise<unknown>
  createLabel?: (q: string) => string
  // Cap the number of rendered options so long lists stay fast — type to narrow.
  limit?: number
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.id === value)?.label ?? ''

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q))
  }, [query, options])
  // Only render the first `limit` matches; the rest are reachable by typing more.
  const shown = filtered.slice(0, limit)
  const hiddenCount = filtered.length - shown.length

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const trimmed = query.trim()
  const canCreate =
    !!onCreate && trimmed.length > 0 && !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())

  function choose(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  async function create() {
    if (!onCreate || !trimmed || creating) return
    setCreating(true)
    try {
      await onCreate(trimmed)
      setOpen(false)
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((i) => Math.min(i + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      if (open && shown[hi]) { e.preventDefault(); choose(shown[hi].id) }
      else if (open && canCreate) { e.preventDefault(); create() }
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={open ? query : selectedLabel}
        placeholder={selectedLabel && !open ? selectedLabel : placeholder}
        onFocus={() => { setOpen(true); setQuery(''); setHi(0) }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0) }}
        onKeyDown={onKeyDown}
        className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-[#E1E8F2] bg-white shadow-[0_16px_40px_-12px_rgba(18,45,90,0.35)]">
          {shown.length === 0 && !canCreate && <div className="px-3 py-2.5 text-sm text-[#8492A6]">ไม่พบรายการ</div>}
          {shown.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.id)}
              onMouseEnter={() => setHi(i)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 ${
                i === hi ? 'bg-[#FFF3EC]' : 'hover:bg-[#F6F9FC]'
              } ${o.id === value ? 'font-semibold text-[#EA580C]' : 'text-[#1C1917]'}`}
            >
              <span className="text-sm truncate">{o.label}</span>
              {o.sub && <span className="text-[12px] text-[#8492A6] shrink-0">{o.sub}</span>}
            </button>
          ))}
          {hiddenCount > 0 && (
            <div className="px-3 py-2 text-[12px] text-[#8492A6] border-t border-[#EEF2F8] bg-[#FBFCFE]">
              แสดง {shown.length} จาก {filtered.length} รายการ · พิมพ์เพื่อค้นหาให้แคบลง
            </div>
          )}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={create}
              disabled={creating}
              className="w-full text-left px-3 py-2.5 border-t border-[#EEF2F8] text-sm font-semibold text-[#EA580C] hover:bg-[#FFF3EC] disabled:opacity-60"
            >
              {creating ? 'กำลังเพิ่ม…' : createLabel(trimmed)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
