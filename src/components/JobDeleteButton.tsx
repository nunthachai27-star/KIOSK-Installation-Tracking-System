'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/lib/dialog'

// ปุ่มย้ายงานลงถังขยะ (soft delete) — งานไม่หายจริง กู้คืนได้ที่หน้าถังขยะ
export function JobDeleteButton({ jobId, jobCode, isSuper }: { jobId: string; jobCode: string; isSuper?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!(await confirmDialog({
      title: 'ย้ายงานลงถังขยะ?',
      message: `ย้ายงาน "${jobCode}" ลงถังขยะ — งานจะถูกซ่อนจากทุกหน้า แต่ยังกู้คืนได้ภายหลัง (ไม่ได้ลบถาวร)`,
      danger: true, confirmText: 'ย้ายลงถังขยะ',
    }))) return
    setBusy(true)
    try {
      const r = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (r.ok) router.push('/')
      else { const d = await r.json().catch(() => ({})); alert(d.message || d.error || 'ลบไม่สำเร็จ'); setBusy(false) }
    } catch { alert('ลบไม่สำเร็จ'); setBusy(false) }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={del} disabled={busy}
        className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-[#F0C9C9] text-[#C13540] hover:bg-[#FBE4E4] disabled:opacity-60">
        {busy ? 'กำลังย้าย…' : '🗑️ ย้ายงานลงถังขยะ'}
      </button>
      {isSuper && (
        <Link href="/jobs/trash" className="text-[12.5px] font-semibold text-[#5A6B82] hover:text-[var(--brand)]">ดูถังขยะงาน →</Link>
      )}
    </div>
  )
}
