'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HandoverStatus, InvoiceStatus } from '@prisma/client'
import type { SerializedJob, SerializedInvoice } from '@/lib/serialize'
import { StatusBadge } from './StatusBadge'
import { canCloseJob } from '@/lib/close'
import { warrantyEndFrom } from '@/lib/warranty'

const warrantyFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'ยังไม่เปิดใบแจ้งหนี้',
  ISSUED: 'เปิดใบแจ้งหนี้แล้ว',
  SENT_TO_ACCOUNTING: 'ส่งเอกสารให้แผนกบัญชีแล้ว',
}

type InvoiceFormState = {
  status: InvoiceStatus
  invoiceDate: string
  invoiceNo: string
  invoiceAmount: string
  remark: string
}

function initialInvoice(invoice: SerializedInvoice | null): InvoiceFormState {
  return {
    status: invoice?.status ?? 'PENDING',
    invoiceDate: toDateInput(invoice?.invoiceDate),
    invoiceNo: invoice?.invoiceNo ?? '',
    invoiceAmount: invoice?.invoiceAmount != null ? String(invoice.invoiceAmount) : '',
    remark: invoice?.remark ?? '',
  }
}

export function InvoiceForm({
  job,
  invoice,
  handoverStatus,
}: {
  job: SerializedJob
  invoice: SerializedInvoice | null
  handoverStatus: HandoverStatus
}) {
  const router = useRouter()
  const [iForm, setIForm] = useState<InvoiceFormState>(() => initialInvoice(invoice))

  const [iSaving, setISaving] = useState(false)
  const [iSaved, setISaved] = useState(false)
  const [iError, setIError] = useState('')

  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState('')
  const [closed, setClosed] = useState(job.currentStatus === 'CLOSED')

  const readiness = canCloseJob({
    handover: { handoverStatus },
    invoice: { status: iForm.status },
  })

  function setI<K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) {
    setIForm(f => ({ ...f, [key]: value }))
    setISaved(false)
  }

  const warrantyEnd = iForm.invoiceDate ? warrantyEndFrom(new Date(iForm.invoiceDate)) : null

  async function saveInvoice() {
    setISaving(true)
    setIError('')

    const body = {
      status: iForm.status,
      invoiceDate: iForm.invoiceDate || null,
      invoiceNo: iForm.invoiceNo || null,
      invoiceAmount: iForm.invoiceAmount === '' ? null : iForm.invoiceAmount,
      remark: iForm.remark || null,
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}/invoice`, {
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

  async function closeJob() {
    setClosing(true)
    setCloseError('')

    try {
      const res = await fetch(`/api/jobs/${job.id}/close`, { method: 'POST' })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; reasons?: string[] } | null
        if (res.status === 403) {
          setCloseError('คุณไม่มีสิทธิ์ปิดงานนี้')
        } else if (body?.reasons?.length) {
          setCloseError(body.reasons.join(', '))
        } else {
          setCloseError('ปิดงานไม่สำเร็จ กรุณาลองใหม่')
        }
        return
      }

      setClosed(true)
      router.refresh()
    } catch {
      setCloseError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
            <div className="text-[15px] font-bold mb-4">ใบแจ้งหนี้/บริจาค</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1">สถานะเปิดใบแจ้งหนี้</label>
                <select value={iForm.status} onChange={e => setI('status', e.target.value as InvoiceStatus)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5">
                  {(Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map(s => (
                    <option key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1">วันที่เปิด</label>
                <input type="date" value={iForm.invoiceDate} onChange={e => setI('invoiceDate', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
                {warrantyEnd && (
                  <div className="mt-2 rounded-lg bg-[#F3EEFF] text-[#6D28D9] text-[13px] px-3 py-2">
                    🛡 รับประกันถึง <span className="font-bold">{warrantyFmt.format(warrantyEnd)}</span>
                    <span className="text-[#8B7FB0]"> · 1 ปีจากวันเปิดบิล</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1">เลขที่ใบแจ้งหนี้</label>
                <input value={iForm.invoiceNo} onChange={e => setI('invoiceNo', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1">มูลค่า (บาท)</label>
                <input type="number" min={0} step="0.01" value={iForm.invoiceAmount} onChange={e => setI('invoiceAmount', e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1">หมายเหตุ</label>
                <textarea value={iForm.remark} onChange={e => setI('remark', e.target.value)} rows={2} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5" />
              </div>
            </div>

            {iError && <div className="text-sm text-[#C13540] font-medium mt-4">{iError}</div>}

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                disabled={iSaving}
                onClick={saveInvoice}
                className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60"
              >
                {iSaving ? 'กำลังบันทึก…' : 'บันทึกใบแจ้งหนี้'}
              </button>
              {iSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5 flex flex-col gap-4">
          <div className="text-[15px] font-bold">ความพร้อมปิดงาน</div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#5A6B82]">สถานะงาน</span>
            <StatusBadge status={closed ? 'CLOSED' : job.currentStatus} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0"
                style={
                  handoverStatus === 'DELIVERED'
                    ? { background: '#157F4C', color: '#fff' }
                    : { background: '#EAEFF6', color: '#A2AEC0' }
                }
              >
                ✓
              </span>
              <span className="text-sm font-medium text-[#1C1917]">ส่งมอบงานแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0"
                style={
                  iForm.status !== 'PENDING'
                    ? { background: '#157F4C', color: '#fff' }
                    : { background: '#EAEFF6', color: '#A2AEC0' }
                }
              >
                ✓
              </span>
              <span className="text-sm font-medium text-[#1C1917]">เปิดใบแจ้งหนี้แล้ว</span>
            </div>
          </div>

          {!readiness.ok && !closed && (
            <div className="bg-[#FBE4E4] border border-[#F3C6C6] rounded-lg px-3 py-2.5 flex flex-col gap-1">
              {readiness.reasons.map(reason => (
                <div key={reason} className="text-xs font-semibold text-[#C13540]">• {reason}</div>
              ))}
            </div>
          )}

          {closeError && <div className="text-sm text-[#C13540] font-medium">{closeError}</div>}

          {closed ? (
            <div className="text-sm font-semibold text-[#157F4C]">ปิดงานแล้ว ✓</div>
          ) : (
            <button
              type="button"
              disabled={!readiness.ok || closing}
              onClick={closeJob}
              className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {closing ? 'กำลังปิดงาน…' : 'ปิดงาน'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
