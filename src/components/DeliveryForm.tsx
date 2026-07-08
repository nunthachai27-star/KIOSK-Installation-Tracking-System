'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeliveryStatus } from '@prisma/client'
import type { SerializedJob, SerializedDelivery } from '@/lib/serialize'
import { addBusinessDays } from '@/lib/workdays'

const callFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'รอดำเนินการ',
  SCHEDULED: 'กำหนดวันแล้ว',
  SHIPPING: 'กำลังจัดส่ง',
  ARRIVED: 'ถึงปลายทางแล้ว',
  DELAYED: 'ล่าช้า',
  PROBLEM: 'มีปัญหา',
}

type DeliveryFormState = {
  shippedDate: string
  arrivedDate: string
  method: string
  vehicle: string
  trackingNo: string
  status: DeliveryStatus
  estimatedCost: string
  actualCost: string
  remark: string
}

function initialDelivery(delivery: SerializedDelivery | null): DeliveryFormState {
  return {
    shippedDate: toDateInput(delivery?.shippedDate),
    arrivedDate: toDateInput(delivery?.arrivedDate),
    method: delivery?.method ?? '',
    vehicle: delivery?.vehicle ?? '',
    trackingNo: delivery?.trackingNo ?? '',
    status: delivery?.status ?? 'PENDING',
    estimatedCost: delivery?.estimatedCost != null ? String(delivery.estimatedCost) : '',
    actualCost: delivery?.actualCost != null ? String(delivery.actualCost) : '',
    remark: delivery?.remark ?? '',
  }
}

export function DeliveryForm({
  job,
  delivery,
  users,
}: {
  job: SerializedJob
  delivery: SerializedDelivery | null
  users: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [dForm, setDForm] = useState<DeliveryFormState>(() => initialDelivery(delivery))

  const [dSaving, setDSaving] = useState(false)
  const [dSaved, setDSaved] = useState(false)
  const [dError, setDError] = useState('')

  // Installer assignment lives on the job; office can set it here so it surfaces
  // in step 5 for the install team to follow up on the Remote date.
  const [installerId, setInstallerId] = useState(job.installerOwnerId ?? '')
  const [instSaving, setInstSaving] = useState(false)
  const [instSaved, setInstSaved] = useState(false)
  const [instError, setInstError] = useState('')

  async function saveInstaller() {
    setInstSaving(true); setInstSaved(false); setInstError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerOwnerId: installerId || null }),
      })
      if (!res.ok) {
        setInstError(res.status === 403 ? 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
        return
      }
      setInstSaved(true)
      router.refresh()
    } catch {
      setInstError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setInstSaving(false)
    }
  }

  function setD<K extends keyof DeliveryFormState>(key: K, value: DeliveryFormState[K]) {
    setDForm(f => ({ ...f, [key]: value }))
    setDSaved(false)
  }

  // Once shipped, call the hospital to book the install date within 2 business days.
  const callDue = dForm.shippedDate ? addBusinessDays(new Date(dForm.shippedDate), 2) : null

  async function saveDelivery() {
    setDSaving(true)
    setDError('')

    const body = {
      shippedDate: dForm.shippedDate || null,
      arrivedDate: dForm.arrivedDate || null,
      method: dForm.method || null,
      vehicle: dForm.vehicle || null,
      trackingNo: dForm.trackingNo || null,
      status: dForm.status,
      estimatedCost: dForm.estimatedCost === '' ? null : dForm.estimatedCost,
      actualCost: dForm.actualCost === '' ? null : dForm.actualCost,
      remark: dForm.remark || null,
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setDError(res.status === 403 ? 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
        return
      }

      setDSaved(true)
      router.refresh()
    } catch {
      setDError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setDSaving(false)
    }
  }

  const installerName = users.find(u => u.id === installerId)?.name

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="text-[15px] font-bold">ผู้รับผิดชอบติดตั้ง</div>
          {installerName
            ? <span className="text-[13px] font-semibold text-[#157F4C]">👷 {installerName}</span>
            : <span className="text-[13px] font-semibold text-[#C13540]">ยังไม่ได้มอบหมาย</span>}
        </div>
        <p className="text-[12.5px] text-[#8492A6] mb-3">มอบหมายเจ้าหน้าที่ติดตั้ง — ชื่อและสถานะจัดส่งจะแสดงในขั้นตอน “5. ติดตั้ง &amp; ส่งมอบ” เพื่อให้ทีมติดตั้งโทรติดตามนัดวัน Remote</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="min-w-[240px] flex-1">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เจ้าหน้าที่ติดตั้ง</label>
            <select value={installerId} onChange={e => { setInstallerId(e.target.value); setInstSaved(false) }}
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              <option value="">— ไม่ระบุ —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button type="button" disabled={instSaving} onClick={saveInstaller}
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
            {instSaving ? 'กำลังบันทึก…' : 'บันทึกผู้รับผิดชอบ'}
          </button>
          {instSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
        {instError && <div className="text-sm text-[#C13540] font-medium mt-2">{instError}</div>}
      </div>

      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">การจัดส่ง</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่ขนออก</label>
            <input type="date" value={dForm.shippedDate} onChange={e => setD('shippedDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            {callDue && (
              <div className="mt-2 rounded-lg bg-[#FFF3E9] text-[#C2410C] text-[13px] px-3 py-2">
                📞 โทรนัดโรงพยาบาลเพื่อนัดวันติดตั้ง ภายใน <span className="font-bold">{callFmt.format(callDue)}</span>
                <span className="text-[#B0754A]"> · ภายใน 2 วันทำการจากวันขนออก</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่ส่งถึง</label>
            <input type="date" value={dForm.arrivedDate} onChange={e => setD('arrivedDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วิธีจัดส่ง</label>
            <input value={dForm.method} onChange={e => setD('method', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">รถ/บริษัทขนส่ง</label>
            <input value={dForm.vehicle} onChange={e => setD('vehicle', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เลข Tracking</label>
            <input value={dForm.trackingNo} onChange={e => setD('trackingNo', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">สถานะจัดส่ง</label>
            <select value={dForm.status} onChange={e => setD('status', e.target.value as DeliveryStatus)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              {(Object.keys(DELIVERY_STATUS_LABEL) as DeliveryStatus[]).map(s => (
                <option key={s} value={s}>{DELIVERY_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ประมาณการค่าขนส่ง (บาท)</label>
            <input type="number" min={0} step="0.01" value={dForm.estimatedCost} onChange={e => setD('estimatedCost', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ค่าขนส่งจริง (บาท)</label>
            <input type="number" min={0} step="0.01" value={dForm.actualCost} onChange={e => setD('actualCost', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">หมายเหตุ</label>
            <textarea value={dForm.remark} onChange={e => setD('remark', e.target.value)} rows={2} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
        </div>

        {dError && <div className="text-sm text-[#C13540] font-medium mt-4">{dError}</div>}

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            disabled={dSaving}
            onClick={saveDelivery}
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60"
          >
            {dSaving ? 'กำลังบันทึก…' : 'บันทึกการจัดส่ง'}
          </button>
          {dSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>
    </div>
  )
}
