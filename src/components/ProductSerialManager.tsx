'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SerialType } from '@prisma/client'

type Slot = { serialType: SerialType; label: string; id: string | null }

export function ProductSerialManager({ productType, slots }: { productType: string; slots: Slot[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Slot[]>(slots)
  const [busy, setBusy] = useState<string>('')

  async function toggle(slot: Slot) {
    setBusy(slot.serialType)
    try {
      if (slot.id) {
        const res = await fetch(`/api/settings/serial-slots/${slot.id}`, { method: 'DELETE' })
        if (res.ok) setRows((r) => r.map((s) => (s.serialType === slot.serialType ? { ...s, id: null } : s)))
      } else {
        const res = await fetch('/api/settings/serial-slots', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productType, serialType: slot.serialType }),
        })
        if (res.ok) {
          const created = await res.json()
          setRows((r) => r.map((s) => (s.serialType === slot.serialType ? { ...s, id: created.id } : s)))
        }
      }
      router.refresh()
    } finally { setBusy('') }
  }

  const anyOn = rows.some((s) => s.id)

  return (
    <div className="ds-card p-4 flex flex-col gap-2">
      {!anyOn && <div className="text-[12.5px] text-[#8492A6] pb-1">ยังไม่เลือก — ฟอร์ม QC จะแสดง Serial ครบทุกชนิด</div>}
      {rows.map((s) => {
        const on = !!s.id
        return (
          <button
            key={s.serialType}
            type="button"
            disabled={busy === s.serialType}
            onClick={() => toggle(s)}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-60 ${
              on ? 'border-[#EA580C] bg-[#FFF3EC]' : 'border-[#E1E8F2] bg-white hover:bg-[#F8FAFD]'
            }`}
          >
            <span className={`w-5 h-5 rounded-md grid place-items-center text-white text-[12px] font-bold ${on ? 'bg-[#EA580C]' : 'bg-[#D6DFEA]'}`}>
              {on ? '✓' : ''}
            </span>
            <span className={`text-sm font-medium ${on ? 'text-[#1C1917]' : 'text-[#5A6B82]'}`}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}
