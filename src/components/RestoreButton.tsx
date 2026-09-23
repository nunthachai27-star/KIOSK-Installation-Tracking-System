'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

export function RestoreButton({ id, summary }: { id: string; summary: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function restore() {
    if (!(await confirmDialog({
      title: 'ย้อนคืนรายการนี้?',
      message: `จะย้อนข้อมูลกลับไปสภาพก่อนหน้า:\n"${summary}"\n\n(หากมีการแก้ไขทับหลังจากนั้น การย้อนจะเขียนทับด้วยค่าก่อนหน้า)`,
      confirmText: 'ย้อนคืน',
    }))) return
    setBusy(true)
    try {
      const r = await fetch(`/api/logs/${id}/restore`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.ok) router.refresh()
      else alert(d.error || 'ย้อนคืนไม่สำเร็จ')
    } finally { setBusy(false) }
  }

  return (
    <button onClick={restore} disabled={busy}
      className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[#DCE4EE] text-[#1B5FD9] hover:border-[#1B5FD9] disabled:opacity-60 whitespace-nowrap">
      {busy ? 'กำลังย้อน…' : '↩ ย้อนคืน'}
    </button>
  )
}
