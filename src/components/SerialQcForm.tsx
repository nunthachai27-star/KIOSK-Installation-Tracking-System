'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SerialNumber, QcRecord, SerialType } from '@prisma/client'
import { StepTracker } from './StepTracker'

const SERIAL_TYPES: { type: SerialType; label: string }[] = [
  { type: 'KIOSK', label: 'S/N ตู้ KIOSK' },
  { type: 'MINI_PC', label: 'S/N Mini PC' },
  { type: 'UPS', label: 'S/N UPS' },
  { type: 'PRINTER', label: 'S/N Printer' },
  { type: 'SMART_CARD_READER', label: 'S/N Smart Card Reader' },
  { type: 'BMS', label: 'S/N BMS' },
  { type: 'KEY_ID', label: 'Key ID' },
]

const CHECKLIST_ITEMS = [
  'อุปกรณ์ครบตามรายการ',
  'ทดสอบเปิด-ปิดเครื่อง',
  'ทดสอบ Smart Card Reader',
  'ทดสอบเครื่องพิมพ์',
  'ตรวจสภาพภายนอก/สี',
] as const

type ChecklistState = Record<string, 'pass' | 'fail' | undefined>

function initialChecklist(checklist: unknown): ChecklistState {
  const state: ChecklistState = {}
  if (Array.isArray(checklist)) {
    for (const entry of checklist) {
      if (entry && typeof entry === 'object' && 'item' in entry && 'result' in entry) {
        const item = (entry as { item: unknown }).item
        const result = (entry as { result: unknown }).result
        if (typeof item === 'string' && (result === 'pass' || result === 'fail')) {
          state[item] = result
        }
      }
    }
  }
  return state
}

export function SerialQcForm({
  jobId,
  serials,
  qc,
}: {
  jobId: string
  serials: SerialNumber[]
  qc: QcRecord | null
}) {
  const router = useRouter()
  const [rows, setRows] = useState(serials)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const [checklist, setChecklist] = useState<ChecklistState>(() => initialChecklist(qc?.checklist))
  const [qcSaving, setQcSaving] = useState(false)
  const [qcError, setQcError] = useState('')
  const [passed, setPassed] = useState(qc?.status === 'PASSED')

  function existingSerial(type: SerialType) {
    return rows.find(r => r.serialType === type)
  }

  async function addSerial(type: SerialType) {
    const serialNo = (inputs[type] ?? '').trim()
    if (!serialNo) return
    setSaving(s => ({ ...s, [type]: true }))
    setErrors(e => ({ ...e, [type]: '' }))

    try {
      const res = await fetch(`/api/jobs/${jobId}/serials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialType: type, serialNo }),
      })

      if (!res.ok) {
        if (res.status === 409) {
          setErrors(e => ({ ...e, [type]: 'หมายเลข Serial ซ้ำ' }))
        } else {
          setErrors(e => ({ ...e, [type]: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }))
        }
        return
      }

      const created = (await res.json()) as SerialNumber
      setRows(r => [...r, created])
      setInputs(i => ({ ...i, [type]: '' }))
      router.refresh()
    } catch {
      setErrors(e => ({ ...e, [type]: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }))
    } finally {
      setSaving(s => ({ ...s, [type]: false }))
    }
  }

  function toggleCheck(item: string, result: 'pass' | 'fail') {
    setChecklist(c => ({ ...c, [item]: c[item] === result ? undefined : result }))
  }

  async function submitQc(status: 'PASSED' | 'FAILED') {
    setQcSaving(true)
    setQcError('')

    const checklistPayload = CHECKLIST_ITEMS.map(item => ({ item, result: checklist[item] ?? null }))

    try {
      const res = await fetch(`/api/jobs/${jobId}/qc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, checklist: checklistPayload }),
      })

      if (!res.ok) {
        setQcError('บันทึก QC ไม่สำเร็จ กรุณาลองใหม่')
        return
      }

      if (status === 'PASSED') setPassed(true)
      router.refresh()
    } catch {
      setQcError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setQcSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      <div className="mb-2"><StepTracker active={2} /></div>

      <div className="bg-white border border-[#DEDDEC] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">หมายเลข Serial</div>
        <div className="grid grid-cols-2 gap-4">
          {SERIAL_TYPES.map(({ type, label }) => {
            const existing = existingSerial(type)
            return (
              <div key={type}>
                <label className="block text-sm font-semibold text-[#6E7191] mb-1">{label}</label>
                {existing ? (
                  <div className="w-full border border-[#D3D2E4] rounded-lg px-3 py-2.5 bg-[#EAEAF2] text-sm font-medium text-[#2E3252]">
                    {existing.serialNo}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={inputs[type] ?? ''}
                      onChange={e => setInputs(i => ({ ...i, [type]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSerial(type)
                        }
                      }}
                      placeholder="กรอกหมายเลข Serial"
                      className="flex-1 border border-[#D3D2E4] rounded-lg px-3 py-2.5"
                    />
                    <button
                      type="button"
                      disabled={saving[type]}
                      onClick={() => addSerial(type)}
                      className="bg-[#4C4FE6] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#3E40C4] disabled:opacity-60"
                    >
                      {saving[type] ? 'กำลังบันทึก…' : 'เพิ่ม'}
                    </button>
                  </div>
                )}
                {errors[type] && <p className="text-xs text-[#C13540] mt-1">{errors[type]}</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-[#DEDDEC] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">QC Checklist</div>
        <div className="flex flex-col gap-3">
          {CHECKLIST_ITEMS.map(item => (
            <div key={item} className="flex items-center justify-between border border-[#DEDDEC] rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-[#2E3252]">{item}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleCheck(item, 'pass')}
                  className="w-9 h-9 rounded-full grid place-items-center font-bold text-sm"
                  style={
                    checklist[item] === 'pass'
                      ? { background: '#157F4C', color: '#fff' }
                      : { background: '#E4E4EF', color: '#A6A7C2' }
                  }
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => toggleCheck(item, 'fail')}
                  className="w-9 h-9 rounded-full grid place-items-center font-bold text-sm"
                  style={
                    checklist[item] === 'fail'
                      ? { background: '#C13540', color: '#fff' }
                      : { background: '#E4E4EF', color: '#A6A7C2' }
                  }
                >
                  !
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {qcError && <div className="text-sm text-[#C13540] font-medium">{qcError}</div>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={qcSaving}
          onClick={() => submitQc('PASSED')}
          className="bg-[#4C4FE6] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#3E40C4] disabled:opacity-60"
        >
          {qcSaving ? 'กำลังบันทึก…' : 'QC ผ่าน → พร้อมจัดส่ง'}
        </button>
        {passed && <span className="text-sm font-semibold text-[#157F4C]">พร้อมจัดส่งแล้ว ✓</span>}
      </div>
    </div>
  )
}
