'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InstallationRecord, HandoverRecord, InstallType, InstallStatus, HandoverStatus, DeliveryStatus } from '@prisma/client'
import type { SerializedJob } from '@/lib/serialize'

const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'รอดำเนินการ',
  SCHEDULED: 'กำหนดวันแล้ว',
  SHIPPING: 'กำลังจัดส่ง',
  ARRIVED: 'ถึงปลายทางแล้ว',
  DELAYED: 'ล่าช้า',
  PROBLEM: 'มีปัญหา',
}
const summaryDateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
function fmtSummaryDate(v: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : summaryDateFmt.format(d)
}

function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
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

const CHECKLIST_STATUS_LABEL: Record<HandoverStatus, string> = {
  PENDING: 'รอตอบกลับ',
  RECEIVED: 'ได้รับ Checklist แล้ว',
  DELIVERED: 'ส่งมอบแล้ว',
}

const HANDOVER_STATUS_LABEL: Record<HandoverStatus, string> = {
  PENDING: 'รอส่งมอบ',
  RECEIVED: 'เตรียมส่งมอบ',
  DELIVERED: 'ส่งมอบแล้ว',
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

type HandoverFormState = {
  checklistStatus: HandoverStatus
  checklistReceivedDate: string
  handoverStatus: HandoverStatus
  handoverDate: string
  remark: string
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

function initialHandover(handover: HandoverRecord | null): HandoverFormState {
  return {
    checklistStatus: handover?.checklistStatus ?? 'PENDING',
    checklistReceivedDate: toDateInput(handover?.checklistReceivedDate),
    handoverStatus: handover?.handoverStatus ?? 'PENDING',
    handoverDate: toDateInput(handover?.handoverDate),
    remark: handover?.remark ?? '',
  }
}

export function InstallHandoverForm({
  job,
  installation,
  handover,
  installerName,
  delivery,
  hospital,
}: {
  job: SerializedJob
  installation: InstallationRecord | null
  handover: HandoverRecord | null
  installerName: string | null
  delivery: { status: DeliveryStatus; shippedDate: string | null; arrivedDate: string | null } | null
  hospital: { name: string; province: string }
}) {
  const router = useRouter()
  const [iForm, setIForm] = useState<InstallationFormState>(() => initialInstallation(installation))
  const [hForm, setHForm] = useState<HandoverFormState>(() => initialHandover(handover))

  const [iSaving, setISaving] = useState(false)
  const [iSaved, setISaved] = useState(false)
  const [iError, setIError] = useState('')

  const [hSaving, setHSaving] = useState(false)
  const [hSaved, setHSaved] = useState(false)
  const [hError, setHError] = useState('')

  function setI<K extends keyof InstallationFormState>(key: K, value: InstallationFormState[K]) {
    setIForm(f => ({ ...f, [key]: value }))
    setISaved(false)
  }

  function setH<K extends keyof HandoverFormState>(key: K, value: HandoverFormState[K]) {
    setHForm(f => ({ ...f, [key]: value }))
    setHSaved(false)
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

  async function saveHandover() {
    setHSaving(true)
    setHError('')

    const body = {
      checklistStatus: hForm.checklistStatus,
      checklistReceivedDate: hForm.checklistReceivedDate || null,
      handoverStatus: hForm.handoverStatus,
      handoverDate: hForm.handoverDate || null,
      remark: hForm.remark || null,
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}/handover`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setHError(res.status === 403 ? 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
        return
      }

      setHSaved(true)
      router.refresh()
    } catch {
      setHError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setHSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      {/* Context for the install team: who's assigned + where the delivery stands, to book the Remote date. */}
      <div className="rounded-2xl border border-[#FBD9C4] bg-[#FFF3E9] p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="text-[#8492A6]">ผู้รับผิดชอบติดตั้ง: </span>
            {installerName
              ? <span className="font-bold text-[#1C1917]">👷 {installerName}</span>
              : <span className="font-semibold text-[#C13540]">ยังไม่ได้มอบหมาย (มอบหมายที่ขั้นตอน 4 งานจัดส่ง)</span>}
          </div>
          {delivery && (
            <div className="text-[13px] text-[#5A6B82]">
              สถานะจัดส่ง: <span className="font-semibold text-[#C2410C]">{DELIVERY_STATUS_LABEL[delivery.status]}</span>
              {' · '}ขนออก {fmtSummaryDate(delivery.shippedDate)}
              {delivery.arrivedDate ? ` · ถึง ${fmtSummaryDate(delivery.arrivedDate)}` : ''}
            </div>
          )}
        </div>
        <p className="text-[12.5px] text-[#B0754A] mt-2">📞 โทรติดตามโรงพยาบาลเพื่อนัดวัน Remote / ติดตั้งหน้างาน</p>

        {/* Hospital contact details for the install team to call. */}
        <div className="mt-3 pt-3 border-t border-[#FBD9C4] flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
          <span className="text-[#5A6B82]">🏥 <span className="font-semibold text-[#1C1917]">{hospital.name}</span> · {hospital.province}</span>
          {(job.contactName || job.contactPhone) && (
            <span className="text-[#5A6B82]">ผู้ติดต่อ: <span className="font-semibold text-[#1C1917]">{job.contactName || '—'}</span>
              {job.contactPhone && <> · <a href={`tel:${job.contactPhone}`} className="font-semibold text-[#C2410C] hover:underline">📞 {job.contactPhone}</a></>}
            </span>
          )}
          {(job.supplyContactName || job.supplyContactPhone) && (
            <span className="text-[#5A6B82]">พัสดุ: <span className="font-semibold text-[#1C1917]">{job.supplyContactName || '—'}</span>
              {job.supplyContactPhone && <> · <a href={`tel:${job.supplyContactPhone}`} className="font-semibold text-[#C2410C] hover:underline">📞 {job.supplyContactPhone}</a></>}
            </span>
          )}
          {!job.contactName && !job.contactPhone && !job.supplyContactName && !job.supplyContactPhone && (
            <span className="text-[#B0754A]">ยังไม่มีข้อมูลติดต่อ — เพิ่มที่ขั้นตอน “1. ข้อมูลงาน”</span>
          )}
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
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60"
          >
            {iSaving ? 'กำลังบันทึก…' : 'บันทึกการติดตั้ง'}
          </button>
          {iSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>

      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">Checklist &amp; ส่งมอบงาน</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">Checklist ตอบกลับ</label>
            <select value={hForm.checklistStatus} onChange={e => setH('checklistStatus', e.target.value as HandoverStatus)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              {(Object.keys(CHECKLIST_STATUS_LABEL) as HandoverStatus[]).map(s => (
                <option key={s} value={s}>{CHECKLIST_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่ได้รับ Checklist</label>
            <input type="date" value={hForm.checklistReceivedDate} onChange={e => setH('checklistReceivedDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">สถานะส่งมอบงาน</label>
            <select value={hForm.handoverStatus} onChange={e => setH('handoverStatus', e.target.value as HandoverStatus)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
              {(Object.keys(HANDOVER_STATUS_LABEL) as HandoverStatus[]).map(s => (
                <option key={s} value={s}>{HANDOVER_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่แจ้งส่งมอบ</label>
            <input type="date" value={hForm.handoverDate} onChange={e => setH('handoverDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1">หมายเหตุ</label>
            <textarea value={hForm.remark} onChange={e => setH('remark', e.target.value)} rows={2} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
          </div>
        </div>

        {hError && <div className="text-sm text-[#C13540] font-medium mt-4">{hError}</div>}

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            disabled={hSaving}
            onClick={saveHandover}
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60"
          >
            {hSaving ? 'กำลังบันทึก…' : 'บันทึกการส่งมอบ'}
          </button>
          {hSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>
    </div>
  )
}
