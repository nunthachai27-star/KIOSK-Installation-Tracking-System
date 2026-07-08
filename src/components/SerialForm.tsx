'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SerialNumber, SerialType, SerialStatus } from '@prisma/client'
import { SERIAL_TYPE_LABELS } from '@/lib/serial-types'
import { addBusinessDays } from '@/lib/workdays'

const planFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

type Comp = { name: string; quantity: number; needsSerial: boolean }
type UserOpt = { id: string; name: string }

const REC_STATUS: { value: SerialStatus; label: string }[] = [
  { value: 'PENDING', label: 'รอลง Serial' },
  { value: 'IN_PROGRESS', label: 'กำลังลง' },
  { value: 'DONE', label: 'ลงครบแล้ว' },
  { value: 'PROBLEM', label: 'ติดปัญหา' },
]

function legacyLabel(s: SerialNumber): string {
  if (s.label) return s.label
  if (s.serialType) return SERIAL_TYPE_LABELS[s.serialType as SerialType] ?? s.serialType
  return 'Serial'
}

export function SerialForm({
  jobId, serials, components, bmsCode, quantity, users, record, currentUser,
}: {
  jobId: string
  serials: SerialNumber[]
  components: Comp[]
  bmsCode: string | null
  quantity: number
  users: UserOpt[]
  record: { staffId: string | null; status: SerialStatus; qcPlannedDate: string | null } | null
  currentUser: { id: string; name: string }
}) {
  const router = useRouter()
  const [rows, setRows] = useState(serials)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [filling, setFilling] = useState(false)
  const [fillErr, setFillErr] = useState('')

  const [staffId, setStaffId] = useState(record?.staffId ?? currentUser.id ?? '')
  const [recStatus, setRecStatus] = useState<SerialStatus>(record?.status ?? 'PENDING')
  const [recSaving, setRecSaving] = useState(false)
  const [recSaved, setRecSaved] = useState(false)

  async function saveRecord() {
    setRecSaving(true); setRecSaved(false)
    try {
      const res = await fetch(`/api/jobs/${jobId}/serial-record`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staffId || null, status: recStatus }),
      })
      if (res.ok) { setRecSaved(true); router.refresh() }
    } finally { setRecSaving(false) }
  }

  function setInput(k: string, v: string) { setInputs(i => ({ ...i, [k]: v })) }

  async function post(key: string, body: Record<string, unknown>): Promise<SerialNumber | null> {
    setSaving(s => ({ ...s, [key]: true })); setErrors(e => ({ ...e, [key]: '' }))
    try {
      const res = await fetch(`/api/jobs/${jobId}/serials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) {
        setErrors(e => ({ ...e, [key]: res.status === 409 ? 'หมายเลข Serial ซ้ำ' : 'บันทึกไม่สำเร็จ' }))
        return null
      }
      return (await res.json()) as SerialNumber
    } catch {
      setErrors(e => ({ ...e, [key]: 'เกิดข้อผิดพลาด' })); return null
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  async function addBms() {
    const serialNo = (inputs['newbms'] ?? '').trim()
    if (!serialNo) return
    const created = await post('newbms', { serialType: 'BMS', serialNo })
    if (created) { setRows(r => [...r, created]); setInput('newbms', ''); router.refresh() }
  }

  async function addComponent(unitId: string, compName: string) {
    const key = `u:${unitId}:${compName}`
    const serialNo = (inputs[key] ?? '').trim()
    if (!serialNo) return
    const created = await post(key, { label: compName, parentId: unitId, serialNo })
    if (created) { setRows(r => [...r, created]); setInput(key, ''); router.refresh() }
  }

  async function removeSerial(id: string) {
    const res = await fetch(`/api/jobs/${jobId}/serials/${id}`, { method: 'DELETE' })
    if (res.ok) { setRows(r => r.filter(x => x.id !== id && x.parentId !== id)); router.refresh() }
  }

  async function fillUnits() {
    setFilling(true); setFillErr('')
    try {
      const res = await fetch(`/api/jobs/${jobId}/units/fill`, { method: 'POST' })
      const d = await res.json().catch(() => null)
      if (!res.ok) {
        setFillErr(d?.error === 'no-code' ? 'ยังไม่ได้ตั้งรหัส BMS — ตั้งค่า › ประเภทสินค้า'
          : d?.error === 'too-many' ? `จำนวนมากเกินไป (${d.needed}) — ตรวจสอบช่องจำนวน` : 'สร้างไม่สำเร็จ')
        return
      }
      if (d.created?.length) { setRows(r => [...r, ...d.created]); router.refresh() }
    } finally { setFilling(false) }
  }

  async function generateBms() {
    setErrors(e => ({ ...e, newbms: '' }))
    try {
      const res = await fetch(`/api/jobs/${jobId}/serials/next-bms`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErrors(e => ({ ...e, newbms: d?.error === 'no-code' ? 'ยังไม่ได้ตั้งรหัส BMS — ตั้งค่า › ประเภทสินค้า' : 'ออกเลขไม่สำเร็จ' }))
        return
      }
      const { serialNo } = await res.json()
      setInput('newbms', serialNo)
    } catch {
      setErrors(e => ({ ...e, newbms: 'เกิดข้อผิดพลาด' }))
    }
  }

  const units = rows.filter(s => s.serialType === 'BMS')
  const serialComps = components.filter(c => c.needsSerial)
  const infoComps = components.filter(c => !c.needsSerial)
  const legacy = rows.filter(s => s.serialType !== 'BMS' && !s.parentId)
  const inputCls = 'flex-1 border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm'

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">

      {/* add BMS unit */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-1">เพิ่มเครื่อง (S/N BMS)</div>
        <p className="text-[12.5px] text-[#8492A6] mb-3">แต่ละ S/N BMS = 1 เครื่อง · เพิ่มเลขแล้วจึงลง Serial อุปกรณ์ของเครื่องนั้น</p>
        <div className="max-w-md">
          <div className="flex gap-2">
            <input value={inputs['newbms'] ?? ''} onChange={e => setInput('newbms', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBms() } }}
              placeholder="S/N BMS เช่น BMS-KI69-001" className={inputCls} />
            <button type="button" disabled={saving['newbms']} onClick={addBms}
              className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
              {saving['newbms'] ? '…' : 'เพิ่มเครื่อง'}
            </button>
          </div>
          {bmsCode && (
            <button type="button" onClick={generateBms} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#EA580C] hover:underline">
              ⚙ ออกเลขอัตโนมัติ
            </button>
          )}
          {errors['newbms'] && <p className="text-xs text-[#C13540] mt-1">{errors['newbms']}</p>}
        </div>

        <div className="mt-4 pt-4 border-t border-[#EEF2F8] flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-[#5A6B82]">
            จำนวนตามข้อมูลงาน: <span className="font-bold text-[#1C1917]">{quantity}</span> · เพิ่มแล้ว <span className="font-bold text-[#1C1917]">{units.length}</span> เครื่อง
          </span>
          {quantity - units.length > 0 && (
            <button type="button" onClick={fillUnits} disabled={filling}
              className="ds-hover bg-[#FFEDE1] text-[#EA580C] text-[13px] font-semibold rounded-lg px-3.5 py-1.5 hover:bg-[#FBD3B4] disabled:opacity-60">
              {filling ? 'กำลังสร้าง…' : `＋ สร้างเครื่องตามจำนวน (อีก ${quantity - units.length})`}
            </button>
          )}
          {quantity - units.length === 0 && units.length > 0 && (
            <span className="text-[13px] font-semibold text-[#157F4C]">ครบตามจำนวนแล้ว ✓</span>
          )}
        </div>
        {fillErr && <p className="text-xs text-[#C13540] mt-2">{fillErr}</p>}
      </div>

      {units.length === 0 && (
        <div className="text-center text-[#8492A6] text-sm py-4">ยังไม่มีเครื่อง — เพิ่ม S/N BMS ด้านบนก่อน</div>
      )}

      {/* per-unit component serials */}
      {units.map((unit, idx) => (
        <div key={unit.id} className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#FFEDE1] text-[#EA580C] grid place-items-center font-bold text-sm">{idx + 1}</span>
              <span className="text-[15px] font-bold tnum">{unit.serialNo}</span>
            </div>
            <button type="button" onClick={() => removeSerial(unit.id)} className="text-[13px] text-[#C13540] hover:underline">ลบเครื่องนี้</button>
          </div>

          {serialComps.length === 0 ? (
            <div className="text-sm text-[#8492A6]">ยังไม่ได้กำหนดอุปกรณ์ของสินค้านี้ — ตั้งค่า › ประเภทสินค้า</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              {serialComps.map(c => {
                const key = `u:${unit.id}:${c.name}`
                const list = rows.filter(s => s.parentId === unit.id && s.label === c.name)
                return (
                  <div key={c.name}>
                    <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">
                      {c.name} {c.quantity > 1 && <span className="text-[#8492A6] font-normal">×{c.quantity}</span>}
                    </label>
                    {list.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {list.map(s => (
                          <span key={s.id} className="inline-flex items-center gap-1 bg-[#FFEDE1] text-[#1C1917] rounded-lg pl-2.5 pr-1 py-1 text-[12.5px] font-medium">
                            <span className="break-all">{s.serialNo}</span>
                            <button type="button" onClick={() => removeSerial(s.id)} aria-label="ลบ"
                              className="w-5 h-5 grid place-items-center rounded text-[#7C8AA0] hover:text-[#C13540] hover:bg-white text-xs">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input value={inputs[key] ?? ''} onChange={e => setInput(key, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComponent(unit.id, c.name) } }}
                        placeholder="เพิ่มหมายเลข Serial" className={inputCls} />
                      <button type="button" disabled={saving[key]} onClick={() => addComponent(unit.id, c.name)}
                        className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
                        {saving[key] ? '…' : 'เพิ่ม'}
                      </button>
                    </div>
                    {errors[key] && <p className="text-xs text-[#C13540] mt-1">{errors[key]}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* info components + legacy serials */}
      {(infoComps.length > 0 || legacy.length > 0) && (
        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5 flex flex-col gap-4">
          {infoComps.length > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#8492A6] mb-2">อุปกรณ์ในชุด (ไม่เก็บ Serial)</div>
              <div className="flex flex-wrap gap-2">
                {infoComps.map(c => (
                  <span key={c.name} className="inline-block bg-[#F4F7FB] text-[#5A6B82] rounded-lg px-2.5 py-1 text-[12.5px]">
                    {c.name}{c.quantity > 1 ? ` ×${c.quantity}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {legacy.length > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#8492A6] mb-2">Serial ที่ยังไม่จับคู่เครื่อง (ข้อมูลเดิม)</div>
              <div className="flex flex-wrap gap-2">
                {legacy.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 bg-[#F4F7FB] text-[#3C4A5E] rounded-lg pl-2.5 pr-1 py-1 text-[12.5px]">
                    <span className="break-all">{legacyLabel(s)}: {s.serialNo}</span>
                    <button type="button" onClick={() => removeSerial(s.id)} aria-label="ลบ"
                      className="w-5 h-5 grid place-items-center rounded text-[#7C8AA0] hover:text-[#C13540] hover:bg-white text-xs">✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* recorder + status */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">ผู้บันทึก &amp; สถานะ</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">เจ้าหน้าที่ผู้บันทึก</label>
            <select value={staffId} onChange={e => { setStaffId(e.target.value); setRecSaved(false) }}
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]">
              <option value="">— ไม่ระบุ —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สถานะ</label>
            <select value={recStatus} onChange={e => { setRecStatus(e.target.value as SerialStatus); setRecSaved(false) }}
              className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]">
              {REC_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {recStatus === 'DONE' && (
          <div className="mt-3 rounded-lg bg-[#E4EEFF] text-[#1B5FD9] text-[13px] px-4 py-2.5">
            📅 วางแผนตรวจ QC: <span className="font-bold">
              {planFmt.format(record?.status === 'DONE' && record.qcPlannedDate ? new Date(record.qcPlannedDate) : addBusinessDays(new Date(), 3))}
            </span>
            <span className="text-[#5A6B82]"> · ภายใน 3 วันทำการ (ไม่รวมเสาร์-อาทิตย์)</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button type="button" disabled={recSaving} onClick={saveRecord}
            className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
            {recSaving ? 'กำลังบันทึก…' : 'บันทึกการลง Serial'}
          </button>
          {recSaved && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
        </div>
      </div>
    </div>
  )
}
