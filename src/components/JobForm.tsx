'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Hospital, User } from '@prisma/client'
import type { SerializedJob } from '@/lib/serialize'
import { StepTracker } from './StepTracker'

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
  contractNo: string
  contractStartDate: string
  contractEndDate: string
  deliveryDueDate: string
  adminOwnerId: string
  installerOwnerId: string
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
    contractNo: job?.contractNo ?? '',
    contractStartDate: toDateInput(job?.contractStartDate),
    contractEndDate: toDateInput(job?.contractEndDate),
    deliveryDueDate: toDateInput(job?.deliveryDueDate),
    adminOwnerId: job?.adminOwnerId ?? '',
    installerOwnerId: job?.installerOwnerId ?? '',
  }
}

type FieldErrors = Record<string, string[] | undefined>

export function JobForm({ job, hospitals, users }: { job?: SerializedJob; hospitals: HospitalOption[]; users: UserOption[] }) {
  const router = useRouter()
  const isEdit = Boolean(job)
  const [form, setForm] = useState<JobFormState>(() => initialState(job))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function set<K extends keyof JobFormState>(key: K, value: JobFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function onHospitalChange(hospitalId: string) {
    const h = hospitals.find(h => h.id === hospitalId)
    setForm(f => ({ ...f, hospitalId, province: h ? h.province : f.province }))
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
      contractNo: form.contractNo || null,
      contractStartDate: form.contractStartDate || null,
      contractEndDate: form.contractEndDate || null,
      deliveryDueDate: form.deliveryDueDate || null,
      adminOwnerId: form.adminOwnerId || null,
      installerOwnerId: form.installerOwnerId || null,
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

  const err = (field: string) => fieldErrors[field]?.[0]

  return (
    <div className="p-6 max-w-[1160px] mx-auto">
      <div className="mb-6"><StepTracker active={1} /></div>

      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="bg-white border border-[#DEDDEC] rounded-2xl p-5">
          <div className="text-[15px] font-bold mb-4">ข้อมูลงาน</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">เลขที่งาน (Job Code)</label>
              <input value={form.jobCode} onChange={e => set('jobCode', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
              {err('jobCode') && <p className="text-xs text-[#C13540] mt-1">{err('jobCode')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">โรงพยาบาล</label>
              <select value={form.hospitalId} onChange={e => onHospitalChange(e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5">
                <option value="">— เลือกโรงพยาบาล —</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {err('hospitalId') && <p className="text-xs text-[#C13540] mt-1">{err('hospitalId')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">จังหวัด</label>
              <input value={form.province} onChange={e => set('province', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
              {err('province') && <p className="text-xs text-[#C13540] mt-1">{err('province')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">ประเภทสินค้า</label>
              <input value={form.productType} onChange={e => set('productType', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
              {err('productType') && <p className="text-xs text-[#C13540] mt-1">{err('productType')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">รุ่น/อุปกรณ์เสริม</label>
              <input value={form.productModel} onChange={e => set('productModel', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">สี</label>
              <input value={form.color} onChange={e => set('color', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">จำนวน</label>
              <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
              {err('quantity') && <p className="text-xs text-[#C13540] mt-1">{err('quantity')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">ยอดขาย (บาท)</label>
              <input type="number" min={0} step="0.01" value={form.salesAmount} onChange={e => set('salesAmount', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
              {err('salesAmount') && <p className="text-xs text-[#C13540] mt-1">{err('salesAmount')}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DEDDEC] rounded-2xl p-5">
          <div className="text-[15px] font-bold mb-4">ผู้ติดต่อ &amp; เอกสาร</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">ผู้ติดต่อหลัก</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">เบอร์โทร</label>
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">เลขที่สัญญา/PO</label>
              <input value={form.contractNo} onChange={e => set('contractNo', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">กำหนดส่งมอบ</label>
              <input type="date" value={form.deliveryDueDate} onChange={e => set('deliveryDueDate', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">วันที่เริ่มสัญญา</label>
              <input type="date" value={form.contractStartDate} onChange={e => set('contractStartDate', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">วันที่สิ้นสุดสัญญา</label>
              <input type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">ผู้รับผิดชอบฝ่ายธุรการ</label>
              <select value={form.adminOwnerId} onChange={e => set('adminOwnerId', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5">
                <option value="">— ไม่ระบุ —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#6E7191] mb-1">ผู้รับผิดชอบติดตั้ง</label>
              <select value={form.installerOwnerId} onChange={e => set('installerOwnerId', e.target.value)} className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5">
                <option value="">— ไม่ระบุ —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {formError && <div className="text-sm text-[#C13540] font-medium">{formError}</div>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="bg-[#4C4FE6] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#3E40C4] disabled:opacity-60">
            {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลงาน'}
          </button>
          {saved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </form>
    </div>
  )
}
