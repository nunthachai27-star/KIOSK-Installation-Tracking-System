'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

// ปุ่มในหน้าถังขยะงาน: กู้คืน / ลบถาวร (เฉพาะ super admin)
export function JobTrashActions({ jobId, jobCode }: { jobId: string; jobCode: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')

  async function restore() {
    if (!(await confirmDialog({ title: 'กู้คืนงาน', message: `กู้คืนงาน "${jobCode}" กลับมาใช้งาน?`, confirmText: 'กู้คืน' }))) return
    setBusy('restore')
    const r = await fetch(`/api/jobs/${jobId}/restore`, { method: 'POST' })
    if (r.ok) router.refresh(); else { const d = await r.json().catch(() => ({})); alert(d.error || 'กู้คืนไม่สำเร็จ'); setBusy('') }
  }
  async function purge() {
    if (!(await confirmDialog({ title: 'ลบถาวร', message: `ลบงาน "${jobCode}" ถาวร พร้อมข้อมูลลูกทั้งหมด (QC/serial/ส่งของ/บิล ฯลฯ) — ย้อนกลับไม่ได้!`, danger: true, confirmText: 'ลบถาวร' }))) return
    setBusy('purge')
    const r = await fetch(`/api/jobs/${jobId}/purge`, { method: 'DELETE' })
    if (r.ok) router.refresh(); else { const d = await r.json().catch(() => ({})); alert(d.error || 'ลบไม่สำเร็จ'); setBusy('') }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button onClick={restore} disabled={!!busy}
        className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#157F4C] hover:border-[#157F4C] disabled:opacity-60">
        {busy === 'restore' ? 'กำลังกู้…' : '↩ กู้คืน'}
      </button>
      <button onClick={purge} disabled={!!busy}
        className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#F0C9C9] text-[#C13540] hover:bg-[#FBE4E4] disabled:opacity-60">
        {busy === 'purge' ? 'กำลังลบ…' : '🗑️ ลบถาวร'}
      </button>
    </div>
  )
}
