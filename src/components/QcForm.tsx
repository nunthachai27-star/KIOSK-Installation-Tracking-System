'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QcStatus } from '@prisma/client'

type UserOpt = { id: string; name: string }
type UnitItem = { label: string; serialNo: string }
type Unit = { id: string; serialNo: string; qc: { status: QcStatus; checklist: unknown; staffId: string | null; keyId: string | null; licenseKey: string | null; memoLicense: boolean } | null; items: UnitItem[] }
type Mark = { result: 'pass' | 'fail'; by: string; at: string }
type Marks = Record<string, Mark | undefined>
type UnitState = { checklist: Marks; status: QcStatus; staffId: string; keyId: string; licenseKey: string; memoLicense: boolean }

const STATUS_OPTIONS: { value: QcStatus; label: string }[] = [
  { value: 'PENDING', label: 'รอตรวจ' },
  { value: 'PASSED', label: 'ผ่าน' },
  { value: 'FAILED', label: 'ไม่ผ่าน' },
]

const dtFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
function fmtAt(at: string): string {
  const d = new Date(at)
  return isNaN(d.getTime()) ? '' : dtFmt.format(d)
}

function initialChecklist(checklist: unknown): Marks {
  const state: Marks = {}
  if (Array.isArray(checklist)) {
    for (const entry of checklist) {
      if (entry && typeof entry === 'object' && 'item' in entry && 'result' in entry) {
        const e = entry as { item: unknown; result: unknown; by?: unknown; at?: unknown }
        if (typeof e.item === 'string' && (e.result === 'pass' || e.result === 'fail')) {
          state[e.item] = {
            result: e.result,
            by: typeof e.by === 'string' ? e.by : '',
            at: typeof e.at === 'string' ? e.at : '',
          }
        }
      }
    }
  }
  return state
}

export function QcForm({
  jobId, units, checklistItems, users, currentUser, hospital,
}: {
  jobId: string
  units: Unit[]
  checklistItems: string[]
  users: UserOpt[]
  currentUser: { id: string; name: string }
  hospital: { id: string; name: string; code: string | null }
}) {
  const router = useRouter()
  // รหัสสถานพยาบาล — เก็บที่ตัวโรงพยาบาล (ใช้ร่วมทุกงานของ รพ.นี้) บันทึกแยกจาก QC รายเครื่อง
  const [hCode, setHCode] = useState(hospital.code ?? '')
  const [hSaving, setHSaving] = useState(false)
  const [hSaved, setHSaved] = useState(false)
  async function saveHospitalCode() {
    setHSaving(true); setHSaved(false)
    try {
      const res = await fetch(`/api/hospitals/${hospital.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: hCode }),
      })
      if (res.ok) { setHSaved(true); router.refresh() }
    } finally { setHSaving(false) }
  }
  const [state, setState] = useState<Record<string, UnitState>>(() => {
    const m: Record<string, UnitState> = {}
    for (const u of units) m[u.id] = { checklist: initialChecklist(u.qc?.checklist), status: u.qc?.status ?? 'PENDING', staffId: u.qc?.staffId ?? '', keyId: u.qc?.keyId ?? '', licenseKey: u.qc?.licenseKey ?? '', memoLicense: u.qc?.memoLicense ?? false }
    return m
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  function patch(unitId: string, upd: Partial<UnitState>) {
    setState(s => ({ ...s, [unitId]: { ...s[unitId], ...upd } }))
    setSaved(x => ({ ...x, [unitId]: false }))
  }
  function toggle(unitId: string, item: string, result: 'pass' | 'fail') {
    const st = state[unitId]
    const same = st.checklist[item]?.result === result
    const nextMark: Mark | undefined = same ? undefined : { result, by: currentUser.name, at: new Date().toISOString() }
    const upd: Partial<UnitState> = { checklist: { ...st.checklist, [item]: nextMark } }
    // Stamp the inspector with the person marking, if not chosen yet.
    if (nextMark && !st.staffId && currentUser.id) upd.staffId = currentUser.id
    patch(unitId, upd)
  }

  async function save(unitId: string) {
    setSaving(x => ({ ...x, [unitId]: true })); setSaved(x => ({ ...x, [unitId]: false }))
    const st = state[unitId]
    const checklist = checklistItems.map(item => {
      const m = st.checklist[item]
      return { item, result: m?.result ?? null, by: m?.by ?? null, at: m?.at ?? null }
    })
    try {
      const res = await fetch(`/api/jobs/${jobId}/units/${unitId}/qc`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: st.status, staffId: st.staffId || null, checklist, keyId: st.keyId || null, licenseKey: st.licenseKey || null, memoLicense: st.memoLicense }),
      })
      if (res.ok) { setSaved(x => ({ ...x, [unitId]: true })); router.refresh() }
    } finally {
      setSaving(x => ({ ...x, [unitId]: false }))
    }
  }

  const selCls = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C]'

  if (units.length === 0) {
    return (
      <div className="p-6 max-w-[1160px] mx-auto">
        <div className="bg-white border border-[#E7EDF4] rounded-2xl p-8 text-center text-[#8492A6]">
          ยังไม่มีเครื่อง (S/N BMS) — เพิ่มที่ขั้นตอน “2. ลง Serial” ก่อน แล้วจึงตรวจ QC ทีละเครื่อง
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1160px] mx-auto flex flex-col gap-6">
      {/* หัวข้อ: โรงพยาบาล (จากข้อมูลงาน) + รหัสสถานพยาบาล */}
      <div className="bg-white border border-[#E7EDF4] rounded-2xl p-5 flex flex-wrap items-start gap-x-8 gap-y-4">
        <div className="min-w-[240px]">
          <div className="text-sm font-semibold text-[#5A6B82] mb-1.5">โรงพยาบาล</div>
          <div className="h-[42px] flex items-center gap-1.5 text-[15px] font-bold text-[#1C1917]">🏥 {hospital.name}</div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสสถานพยาบาล</label>
          <div className="h-[42px] flex items-center gap-2">
            <input value={hCode} onChange={e => { setHCode(e.target.value); setHSaved(false) }}
              placeholder="เช่น 10715" onBlur={() => { if ((hCode.trim() || null) !== (hospital.code ?? null)) saveHospitalCode() }}
              className="w-40 border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] tnum" />
            {hSaving ? <span className="text-[12px] text-[#8492A6]">กำลังบันทึก…</span>
              : hSaved ? <span className="text-[12px] font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span> : null}
          </div>
          <div className="text-[11.5px] text-[#A8A29E] mt-1">ใช้ร่วมทุกงานของโรงพยาบาลนี้</div>
        </div>
      </div>

      {units.map((unit, idx) => {
        const st = state[unit.id]
        return (
          <div key={unit.id} className="bg-white border border-[#E7EDF4] rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-[#FFEDE1] text-[#EA580C] grid place-items-center font-bold text-sm">{idx + 1}</span>
              <span className="text-[15px] font-bold tnum">{unit.serialNo}</span>
            </div>

            {unit.items.length > 0 && (
              <div className="mb-4 rounded-xl bg-[#F8FAFD] border border-[#EEF2F8] px-4 py-3">
                <div className="text-[12.5px] font-semibold text-[#5A6B82] mb-2">อุปกรณ์ที่ลง Serial แล้ว ({unit.items.length})</div>
                <div className="flex flex-col gap-1.5">
                  {unit.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="text-[#57534E]">{it.label}</span>
                      <span className="font-semibold tnum text-[#1C1917]">{it.serialNo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checklistItems.length === 0 ? (
              <div className="text-sm text-[#8492A6] mb-4">ยังไม่มีรายการตรวจสอบ — ตั้งค่า › ประเภทสินค้า</div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-4">
                {checklistItems.map(item => {
                  const m = st.checklist[item]
                  return (
                    <div key={item} className="flex items-center justify-between gap-3 border border-[#E7EDF4] rounded-lg px-4 py-2.5">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[#1C1917]">{item}</span>
                        {m && (
                          <div className="text-[11.5px] text-[#8492A6] mt-0.5">
                            โดย {m.by || '—'}{m.at ? ` · ${fmtAt(m.at)}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => toggle(unit.id, item, 'pass')}
                          className="w-8 h-8 rounded-full grid place-items-center font-bold text-sm"
                          style={m?.result === 'pass' ? { background: '#157F4C', color: '#fff' } : { background: '#EAEFF6', color: '#A2AEC0' }}>✓</button>
                        <button type="button" onClick={() => toggle(unit.id, item, 'fail')}
                          className="w-8 h-8 rounded-full grid place-items-center font-bold text-sm"
                          style={m?.result === 'fail' ? { background: '#C13540', color: '#fff' } : { background: '#EAEFF6', color: '#A2AEC0' }}>!</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">เจ้าหน้าที่ผู้ตรวจ</label>
                <select value={st.staffId} onChange={e => patch(unit.id, { staffId: e.target.value })} className={selCls}>
                  <option value="">— ไม่ระบุ —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">สถานะ</label>
                <select value={st.status} onChange={e => patch(unit.id, { status: e.target.value as QcStatus })} className={selCls}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">Key ID / MAC Address</label>
              <input value={st.keyId} onChange={e => patch(unit.id, { keyId: e.target.value })}
                placeholder="เช่น 00:1A:2B:3C:4D:5E หรือ Key ID ของเครื่อง"
                className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] tnum" />
              <label className="block text-sm font-semibold text-[#5A6B82] mt-3 mb-1.5">License Key</label>
              <input value={st.licenseKey} onChange={e => patch(unit.id, { licenseKey: e.target.value })}
                placeholder="License Key ของเครื่อง"
                className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] tnum" />
              <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={st.memoLicense} onChange={e => patch(unit.id, { memoLicense: e.target.checked })}
                  className="w-4 h-4 accent-[#EA580C]" />
                <span className="text-sm font-semibold text-[#5A6B82]">ขอเปิด MEMO License แล้ว</span>
              </label>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button type="button" disabled={saving[unit.id]} onClick={() => save(unit.id)}
                className="bg-[#EA580C] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#C2410C] disabled:opacity-60">
                {saving[unit.id] ? 'กำลังบันทึก…' : 'บันทึก QC เครื่องนี้'}
              </button>
              {saved[unit.id] && <span className="text-sm font-semibold text-[#157F4C]">บันทึกแล้ว ✓</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
