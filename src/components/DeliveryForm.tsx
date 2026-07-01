'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InstallationRecord, DeliveryStatus, InstallType, InstallStatus } from '@prisma/client'
import type { SerializedJob, SerializedDelivery } from '@/lib/serialize'
import { StepTracker } from './StepTracker'

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

const INSTALL_TYPE_LABEL: Record<InstallType, string> = {
  REMOTE: 'Remote เท่านั้น',
  ONSITE: 'ติดตั้งหน้างานเท่านั้น',
  REMOTE_ONSITE: 'Remote + ติดตั้งหน้างาน',
}

const INSTALL_STATUS_LABEL: Record<InstallStatus, string> = {
  PENDING: 'รอดำเนินการ',
  SCHEDULED: 'กำหนดวันแล้ว',
  INSTALLING: 'กำลังติดตั้ง',
  DONE: 'ติดตั้งเสร็จสิ้น',
  FAILED: 'ติดตั้งไม่สำเร็จ',
  PROBLEM: 'มีปัญหา',
  POSTPONED: 'เลื่อนกำหนด',
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

type InstallationFormState = {
  installType: InstallType
  remoteDate: string
  onsiteDate: string
  status: InstallStatus
  result: string
  problem: string
  solution: string
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

function initialInstallation(installation: InstallationRecord | null): InstallationFormState {
  return {
    installType: installation?.installType ?? 'REMOTE_ONSITE',
    remoteDate: toDateInput(installation?.remoteDate),
    onsiteDate: toDateInput(installation?.onsiteDate),
    status: installation?.status ?? 'PENDING',
    result: installation?.result ?? '',
    problem: installation?.problem ?? '',
    solution: installation?.solution ?? '',
  }
}

export function DeliveryForm({
  job,
  delivery,
  installation,
}: {
  job: SerializedJob
  delivery: SerializedDelivery | null
  installation: InstallationRecord | null
}) {
  const router = useRouter()
  const [dForm, setDForm] = useState<DeliveryFormState>(() => initialDelivery(delivery))
  const [iForm, setIForm] = useState<InstallationFormState>(() => initialInstallation(installation))

  const [dSaving, setDSaving] = useState(false)
  const [dSaved, setDSaved] = useState(false)
  const [dError, setDError] = useState('')

  const [iSaving, setISaving] = useState(false)
  const [iSaved, setISaved] = useState(false)
  const [iError, setIError] = useState('')

  function setD<K extends keyof DeliveryFormState>(key: K, value: DeliveryFormState[K]) {
    setDForm(f => ({ ...f, [key]: value }))
    setDSaved(false)
  }

  function setI<K extends keyof InstallationFormState>(key: K, value: InstallationFormState[K]) {
    setIForm(f => ({ ...f, [key]: value }))
    setISaved(false)
  }

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

  async function saveInstallation() {
    setISaving(true)
    setIError('')

    const body = {
      installType: iForm.installType,
      remoteDate: iForm.remoteDate || null,
      onsiteDate: iForm.onsiteDate || null,
      status: iForm.status,
      result: iForm.result || null,
      problem: iForm.problem || null,
      solution: iForm.solution || null,
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}/installation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setIError(res.status === 403 ? 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
        return
      }

      setISaved(true)
      router.refresh()
    } catch {
      setIError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setISaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      <div className="mb-2"><StepTracker active={3} /></div>

      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">การจัดส่ง</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่ขนออก</label>
            <input type="date" value={dForm.shippedDate} onChange={e => setD('shippedDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
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
            className="bg-[#2F6BED] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#2558C5] disabled:opacity-60"
          >
            {dSaving ? 'กำลังบันทึก…' : 'บันทึกการจัดส่ง'}
          </button>
          {dSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>

      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">Remote &amp; ติดตั้งหน้างาน</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">รูปแบบการติดตั้ง</label>
            <select value={iForm.installType} onChange={e => setI('installType', e.target.value as InstallType)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              {(Object.keys(INSTALL_TYPE_LABEL) as InstallType[]).map(t => (
                <option key={t} value={t}>{INSTALL_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">สถานะติดตั้ง</label>
            <select value={iForm.status} onChange={e => setI('status', e.target.value as InstallStatus)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              {(Object.keys(INSTALL_STATUS_LABEL) as InstallStatus[]).map(s => (
                <option key={s} value={s}>{INSTALL_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">กำหนด Remote</label>
            <input type="date" value={iForm.remoteDate} onChange={e => setI('remoteDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันนัดติดตั้งหน้างาน</label>
            <input type="date" value={iForm.onsiteDate} onChange={e => setI('onsiteDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ผลการติดตั้ง</label>
            <input value={iForm.result} onChange={e => setI('result', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ปัญหา</label>
            <textarea value={iForm.problem} onChange={e => setI('problem', e.target.value)} rows={2} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วิธีแก้ไข</label>
            <textarea value={iForm.solution} onChange={e => setI('solution', e.target.value)} rows={2} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
        </div>

        {iError && <div className="text-sm text-[#C13540] font-medium mt-4">{iError}</div>}

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            disabled={iSaving}
            onClick={saveInstallation}
            className="bg-[#2F6BED] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#2558C5] disabled:opacity-60"
          >
            {iSaving ? 'กำลังบันทึก…' : 'บันทึกการติดตั้ง'}
          </button>
          {iSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>
    </div>
  )
}
