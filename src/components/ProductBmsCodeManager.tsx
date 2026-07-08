'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProductBmsCodeManager({ productType, initialCode }: { productType: string; initialCode: string }) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const yy = String((new Date().getFullYear() + 543) % 100).padStart(2, '0')

  async function save() {
    setSaving(true); setSaved(false); setErr('')
    try {
      const res = await fetch('/api/settings/bms-code', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, code }),
      })
      if (!res.ok) { setErr('บันทึกไม่สำเร็จ'); return }
      setSaved(true)
      router.refresh()
    } finally { setSaving(false) }
  }

  return (
    <div className="ds-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setSaved(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          placeholder="เช่น CIPD"
          className="w-44 border border-[#D6DFEA] rounded-lg px-3 py-2.5 uppercase tracking-wide outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
        />
        <button onClick={save} disabled={saving}
          className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        {saved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        {err && <span className="text-sm text-[#C13540]">{err}</span>}
      </div>
      <div className="text-[12.5px] text-[#8492A6]">
        ตัวอย่างเลขที่ระบบจะออก: <span className="font-semibold text-[#3C4A5E] tnum">BMS-{code || '____'}{yy}-001</span>
        {' '}· เว้นว่าง = ไม่ออกเลขอัตโนมัติ
      </div>
    </div>
  )
}
