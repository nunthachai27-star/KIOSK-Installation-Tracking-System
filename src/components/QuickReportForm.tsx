'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JobStatus } from '@prisma/client'

const STATUS_OPTIONS: { status: JobStatus; label: string; icon: string; color: string; bg: string }[] = [
  { status: 'HANDED_OVER', label: 'ติดตั้งเสร็จเรียบร้อย', icon: '✅', color: '#157F4C', bg: '#E2F3EA' },
  { status: 'INSTALLING', label: 'ยังทำอยู่ / มาต่อพรุ่งนี้', icon: '⏳', color: '#9A6B10', bg: '#FAF0D8' },
  { status: 'PROBLEM', label: 'ติดปัญหา ต้องแจ้งทีม', icon: '⚠️', color: '#C13540', bg: '#FBE4E4' },
]

export function QuickReportForm({ jobId }: { jobId: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selected, setSelected] = useState<JobStatus | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    setPhotoName(file?.name ?? '')
  }

  async function handleSubmit() {
    if (!selected) {
      setError('กรุณาเลือกสถานะงาน')
      return
    }
    setSaving(true)
    setError('')
    try {
      const statusRes = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selected }),
      })
      if (!statusRes.ok) {
        const body = await statusRes.json().catch(() => ({}))
        throw new Error(body?.error ?? 'บันทึกสถานะไม่สำเร็จ')
      }

      if (photo) {
        const form = new FormData()
        form.append('file', photo)
        form.append('refTable', 'Job')
        form.append('refId', jobId)
        const uploadRes = await fetch('/api/attachments/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}))
          throw new Error(body?.error ?? 'แนบรูปไม่สำเร็จ')
        }
      }

      setDone(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="px-5 pt-10 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-lg font-bold text-[#12233B]">บันทึกงานสำเร็จ</div>
        <p className="mt-1 text-sm text-[#5A6B82]">ส่งข้อมูลให้ธุรการเรียบร้อยแล้ว</p>
        <button
          onClick={() => router.push('/m')}
          className="mt-6 w-full rounded-xl bg-[#2F6BED] text-white font-semibold py-3.5"
        >
          กลับหน้างานวันนี้
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-6">
      <h1 className="text-lg font-bold text-[#12233B] mb-4">บันทึกงาน</h1>

      <div className="flex flex-col gap-3">
        {STATUS_OPTIONS.map((opt) => {
          const active = selected === opt.status
          return (
            <button
              key={opt.status}
              type="button"
              onClick={() => setSelected(opt.status)}
              className="flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors"
              style={{
                borderColor: active ? opt.color : '#E7EDF4',
                background: active ? opt.bg : '#FFFFFF',
              }}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-[15px] font-semibold" style={{ color: active ? opt.color : '#12233B' }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-semibold text-[#12233B] mb-2">ถ่ายรูปหน้างาน</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
          id="photo-input"
        />
        <label
          htmlFor="photo-input"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C7D3E3] py-6 text-sm font-semibold text-[#5A6B82] cursor-pointer"
        >
          <span className="text-xl">📷</span>
          {photoName || 'แตะเพื่อถ่ายรูป / เลือกรูป'}
        </label>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-semibold text-[#12233B] mb-2">หมายเหตุ</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
          className="w-full rounded-xl border border-[#E7EDF4] px-4 py-3 text-sm text-[#12233B] focus:outline-none focus:border-[#2F6BED]"
        />
      </div>

      {error && <div className="mt-4 text-sm font-medium text-[#C13540]">{error}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-[#2F6BED] text-white font-bold py-4 text-[15px] disabled:opacity-60"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึก & ส่งให้ธุรการ'}
      </button>
    </div>
  )
}
