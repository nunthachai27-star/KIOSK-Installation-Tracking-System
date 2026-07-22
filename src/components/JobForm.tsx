'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Hospital, User } from '@prisma/client'
import type { SerializedJob } from '@/lib/serialize'
import { withCurrent } from '@/lib/options'
import { Combobox } from '@/components/Combobox'

type HospitalOption = Pick<Hospital, 'id' | 'name' | 'province'>
type UserOption = Pick<User, 'id' | 'name' | 'role'>

function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

type JobFormState = {
  jobCode: string
  hospitalId: string
  province: string
  productType: string
  productModel: string
  color: string
  quantity: string
  salesAmount: string
  contactName: string
  contactPhone: string
  supplyContactName: string
  supplyContactPhone: string
  contractNo: string
  contractStartDate: string
  contractEndDate: string
  deliveryDueDate: string
  adminOwnerId: string
  installerOwnerId: string
  isPlanned: boolean
}

function initialState(job?: SerializedJob): JobFormState {
  return {
    jobCode: job?.jobCode ?? '',
    hospitalId: job?.hospitalId ?? '',
    province: job?.province ?? '',
    productType: job?.productType ?? '',
    productModel: job?.productModel ?? '',
    color: job?.color ?? '',
    quantity: job ? String(job.quantity) : '1',
    salesAmount: job ? String(job.salesAmount) : '0',
    contactName: job?.contactName ?? '',
    contactPhone: job?.contactPhone ?? '',
    supplyContactName: job?.supplyContactName ?? '',
    supplyContactPhone: job?.supplyContactPhone ?? '',
    contractNo: job?.contractNo ?? '',
    contractStartDate: toDateInput(job?.contractStartDate),
    contractEndDate: toDateInput(job?.contractEndDate),
    deliveryDueDate: toDateInput(job?.deliveryDueDate),
    adminOwnerId: job?.adminOwnerId ?? '',
    installerOwnerId: job?.installerOwnerId ?? '',
    isPlanned: job?.isPlanned ?? false,
  }
}

type FieldErrors = Record<string, string[] | undefined>

type ReportUnit = { serialNo: string; items: { label: string; serialNo: string }[] }
type JobReport = { hospitalName: string; units: ReportUnit[] }

export function JobForm({ job, hospitals, users, productTypes, provinces, report }: { job?: SerializedJob; hospitals: HospitalOption[]; users: UserOption[]; productTypes: string[]; provinces: string[]; report?: JobReport }) {
  const router = useRouter()
  const isEdit = Boolean(job)
  const [form, setForm] = useState<JobFormState>(() => initialState(job))
  const [hospitalOpts, setHospitalOpts] = useState<HospitalOption[]>(hospitals)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const isCancelled = job?.currentStatus === 'CANCELLED'

  function set<K extends keyof JobFormState>(key: K, value: JobFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function onHospitalChange(hospitalId: string) {
    const h = hospitalOpts.find(h => h.id === hospitalId)
    setForm(f => ({ ...f, hospitalId, province: h ? h.province : f.province }))
    setSaved(false)
  }

  // Create a new hospital from the typed name (province = current form value).
  async function createHospital(name: string) {
    const res = await fetch('/api/hospitals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, province: form.province || '' }),
    })
    if (!res.ok) { setFormError('เพิ่มโรงพยาบาลไม่สำเร็จ'); return }
    const h = await res.json() as HospitalOption
    setHospitalOpts(prev => (prev.some(p => p.id === h.id) ? prev : [...prev, { id: h.id, name: h.name, province: h.province }]))
    setForm(f => ({ ...f, hospitalId: h.id, province: h.province || f.province }))
    setSaved(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    setFieldErrors({})

    const body = {
      jobCode: form.jobCode,
      hospitalId: form.hospitalId,
      province: form.province,
      productType: form.productType,
      productModel: form.productModel || null,
      color: form.color || null,
      quantity: form.quantity,
      salesAmount: form.salesAmount,
      contactName: form.contactName || null,
      contactPhone: form.contactPhone || null,
      supplyContactName: form.supplyContactName || null,
      supplyContactPhone: form.supplyContactPhone || null,
      // Planned jobs have no contract yet — don't record contract fields.
      contractNo: form.isPlanned ? null : form.contractNo || null,
      contractStartDate: form.isPlanned ? null : form.contractStartDate || null,
      contractEndDate: form.isPlanned ? null : form.contractEndDate || null,
      deliveryDueDate: form.isPlanned ? null : form.deliveryDueDate || null,
      adminOwnerId: form.adminOwnerId || null,
      installerOwnerId: form.installerOwnerId || null,
      isPlanned: form.isPlanned,
    }

    try {
      const res = await fetch(isEdit ? `/api/jobs/${job!.id}` : '/api/jobs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (res.status === 400 && data?.error?.fieldErrors) {
          setFieldErrors(data.error.fieldErrors as FieldErrors)
          setFormError('กรุณาตรวจสอบข้อมูลที่กรอก')
        } else if (res.status === 403) {
          setFormError('คุณไม่มีสิทธิ์บันทึกข้อมูลนี้')
        } else {
          setFormError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
        }
        setSaving(false)
        return
      }

      const created = await res.json()
      if (isEdit) {
        setSaved(true)
        router.refresh()
      } else {
        router.push(`/jobs/${created.id}`)
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  // Void a mistakenly-entered job (kept as history, reversible) via the status route.
  async function setStatus(status: 'CANCELLED' | 'DATA_ENTRY', after: () => void) {
    if (!job) return
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        setCancelError(res.status === 403 ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่')
        return
      }
      after()
    } catch {
      setCancelError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setCancelling(false)
    }
  }

  function cancelJob() {
    if (!window.confirm('ยืนยันยกเลิกรายการนี้?\nงานจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" และซ่อนจากรายการงานปกติ (ดูย้อนหลังได้ที่ "แสดงทั้งหมด")')) return
    setStatus('CANCELLED', () => router.push('/'))
  }

  function restoreJob() {
    setStatus('DATA_ENTRY', () => router.refresh())
  }

  // Build a print-ready Word (.doc) delivery-note report from the saved job data.
  // Read-only — it never writes to the job; it only reads the stored record.
  function downloadReport() {
    if (!job || !report) return
    const esc = (v: string | null | undefined) =>
      (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const title = `ติดตั้ง ${esc(job.productType)}`.trim()
    const hospital = esc(report.hospitalName)
    const province = esc(job.province)
    const contractNo = esc(job.contractNo) || '-'
    // A job may hold several BMS units — one bordered table (installation sheet) each.
    const units = report.units.length ? report.units : [{ serialNo: '', items: [] as ReportUnit['items'] }]

    const blocks = units.map((u, ui) => {
      const bodyRows = u.items.length
        ? u.items.map((it, i) => `<tr>
            <td class="c">${i + 1}</td>
            <td>${esc(it.label)}</td>
            <td>${esc(it.serialNo) || '&nbsp;'}</td>
          </tr>`).join('')
        : `<tr><td class="c">1</td><td>&nbsp;</td><td>&nbsp;</td></tr>`
      return `<table class="sheet"${ui > 0 ? ' style="page-break-before:always"' : ''}>
        <tr><td colspan="3" class="title">${title}</td></tr>
        <tr>
          <td colspan="2" class="hd">โรงพยาบาล ${hospital || '&nbsp;'}&nbsp;&nbsp;&nbsp;&nbsp;จังหวัด ${province || '&nbsp;'}</td>
          <td class="hd">เลขที่สัญญา/PO<br>${contractNo}</td>
        </tr>
        <tr><td colspan="3" class="hd">BMS Serial : ${esc(u.serialNo) || '-'}</td></tr>
        <tr class="head"><td class="c">ลำดับ</td><td class="c">รายการ</td><td class="c">S/N</td></tr>
        ${bodyRows}
      </table>`
    }).join('<p class="gap">&nbsp;</p>')

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 1.6cm 1.4cm; }
  body { font-family: 'TH Sarabun New','Sarabun','Angsana New',sans-serif; font-size: 16pt; color: #000; }
  table.sheet { border-collapse: collapse; width: 100%; }
  table.sheet td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
  td.title { text-align: center; font-weight: bold; font-size: 18pt; padding: 8px; }
  td.hd { font-size: 15pt; }
  tr.head td { background: #EFEFEF; font-weight: bold; text-align: center; }
  td.c { text-align: center; }
  table.sheet tr.head td:nth-child(1) { width: 12%; }
  table.sheet tr.head td:nth-child(3) { width: 34%; }
  p.gap { margin: 14px 0; }
</style></head>
<body>${blocks}</body></html>`

    const safe = (report.hospitalName || job.jobCode || 'job').replace(/[\\/:*?"<>|]+/g, '_').trim()
    const blob = new Blob(['﻿', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ใบส่งของ-${safe}.doc`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const err = (field: string) => fieldErrors[field]?.[0]

  return (
    <div className="p-6 max-w-[1160px] mx-auto">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="text-[15px] font-bold">ข้อมูลงาน</div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#5A6B82]">ประเภทงาน:</span>
              <div className="inline-flex rounded-lg border border-[#D6DFEA] overflow-hidden">
                <button type="button" onClick={() => set('isPlanned', false)}
                  className={`px-4 py-1.5 text-[13px] font-semibold ${!form.isPlanned ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>
                  เซ็นสัญญาแล้ว
                </button>
                <button type="button" onClick={() => set('isPlanned', true)}
                  className={`px-4 py-1.5 text-[13px] font-semibold ${form.isPlanned ? 'bg-[#EA580C] text-white' : 'text-[#5A6B82] hover:bg-[#F4F3F1]'}`}>
                  งานตามแผน
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เลขที่งาน (Job Code)</label>
              <input value={form.jobCode} onChange={e => set('jobCode', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              {err('jobCode') && <p className="text-xs text-[#C13540] mt-1">{err('jobCode')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">โรงพยาบาล</label>
              <Combobox
                value={form.hospitalId}
                onChange={onHospitalChange}
                onCreate={createHospital}
                createLabel={(q) => `+ เพิ่มโรงพยาบาลใหม่ "${q}"`}
                placeholder="พิมพ์ชื่อโรงพยาบาลเพื่อค้นหา / เพิ่มใหม่…"
                options={hospitalOpts.map(h => ({ id: h.id, label: h.name, sub: h.province }))}
              />
              {err('hospitalId') && <p className="text-xs text-[#C13540] mt-1">{err('hospitalId')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">จังหวัด</label>
              <select value={form.province} onChange={e => set('province', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
                <option value="">— เลือกจังหวัด —</option>
                {withCurrent(provinces, form.province).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {err('province') && <p className="text-xs text-[#C13540] mt-1">{err('province')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ประเภทสินค้า</label>
              <select value={form.productType} onChange={e => set('productType', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
                <option value="">— เลือกประเภทสินค้า —</option>
                {withCurrent(productTypes, form.productType).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {err('productType') && <p className="text-xs text-[#C13540] mt-1">{err('productType')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">รุ่น/อุปกรณ์เสริม</label>
              <input value={form.productModel} onChange={e => set('productModel', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">สี</label>
              <input value={form.color} onChange={e => set('color', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">จำนวน</label>
              <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              {err('quantity') && <p className="text-xs text-[#C13540] mt-1">{err('quantity')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ยอดขาย (บาท)</label>
              <input type="number" min={0} step="0.01" value={form.salesAmount} onChange={e => set('salesAmount', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              {err('salesAmount') && <p className="text-xs text-[#C13540] mt-1">{err('salesAmount')}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
          <div className="text-[15px] font-bold mb-4">ผู้ติดต่อ &amp; เอกสาร</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ผู้ติดต่อหลัก</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เบอร์โทร</label>
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ผู้ติดต่อ (พัสดุ)</label>
              <input value={form.supplyContactName} onChange={e => set('supplyContactName', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เบอร์โทร (พัสดุ)</label>
              <input value={form.supplyContactPhone} onChange={e => set('supplyContactPhone', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
            </div>
            {form.isPlanned ? (
              <div className="col-span-2 rounded-lg bg-[#FBEBCB] text-[#8A5A0B] text-[13px] px-4 py-2.5">
                งานตามแผน — ยังไม่บันทึกข้อมูลสัญญา (เลขที่สัญญา/PO · กำหนดส่งมอบ · วันสัญญา จะบันทึกได้เมื่อเปลี่ยนเป็น “เซ็นสัญญาแล้ว”)
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เลขที่สัญญา/PO</label>
                  <input value={form.contractNo} onChange={e => set('contractNo', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1">กำหนดส่งมอบ</label>
                  <input type="date" value={form.deliveryDueDate} onChange={e => set('deliveryDueDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่เริ่มสัญญา</label>
                  <input type="date" value={form.contractStartDate} onChange={e => set('contractStartDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่สิ้นสุดสัญญา</label>
                  <input type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ผู้รับผิดชอบฝ่ายธุรการ</label>
              <select value={form.adminOwnerId} onChange={e => set('adminOwnerId', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
                <option value="">— ไม่ระบุ —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ผู้รับผิดชอบติดตั้ง</label>
              <select value={form.installerOwnerId} onChange={e => set('installerOwnerId', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
                <option value="">— ไม่ระบุ —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {formError && <div className="text-sm text-[#C13540] font-medium">{formError}</div>}

        {isEdit && report && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={downloadReport}
              className="flex items-center gap-1.5 bg-[#1B5FD9] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#164FB3]">
              📄 รายงานขอใบส่งของ
            </button>
            <span className="text-[12.5px] text-[#8492A6]">ดาวน์โหลดไฟล์ Word (.doc) พร้อมปริ้น — ไม่กระทบข้อมูลงาน</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
            {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลงาน'}
          </button>
          {saved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </form>

      {isEdit && (
        <div className="mt-6 border-t border-[#F1F5F9] pt-5">
          {isCancelled ? (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-[#F4F3F1] rounded-xl px-4 py-3">
              <div className="text-sm text-[#57534E]">
                <span className="font-semibold text-[#C13540]">รายการนี้ถูกยกเลิกแล้ว</span> · เก็บไว้เป็นประวัติ
              </div>
              <button type="button" onClick={restoreJob} disabled={cancelling}
                className="text-sm font-semibold rounded-lg px-5 py-2.5 border border-[#D6DFEA] text-[#3C4A5E] hover:bg-white disabled:opacity-60">
                {cancelling ? 'กำลังกู้คืน…' : 'กู้คืนรายการ'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[13px] text-[#8492A6]">หากลงข้อมูลผิด สามารถยกเลิกรายการนี้ได้ (เก็บเป็นประวัติ กู้คืนได้ภายหลัง)</div>
              <button type="button" onClick={cancelJob} disabled={cancelling}
                className="text-sm font-semibold rounded-lg px-5 py-2.5 border border-[#E4B8BB] text-[#C13540] hover:bg-[#FBE4E4] disabled:opacity-60">
                {cancelling ? 'กำลังยกเลิก…' : 'ยกเลิกรายการ'}
              </button>
            </div>
          )}
          {cancelError && <div className="text-sm text-[#C13540] font-medium mt-2">{cancelError}</div>}
        </div>
      )}
    </div>
  )
}
