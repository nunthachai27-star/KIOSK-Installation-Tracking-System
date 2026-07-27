'use client'
import { useState } from 'react'

// Public borrow-request form (no login). Borrowers submit their details only;
// staff pick the actual item and approve inside the office app.
export default function BorrowRequestPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [org, setOrg] = useState('')
  const [due, setDue] = useState('')
  const [purpose, setPurpose] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const phoneOk = /^\d{9,10}$/.test(phone.replace(/[\s-]/g, ''))
  const ready = !!name.trim() && phoneOk

  async function submit() {
    if (!ready || saving) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/borrow-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowerName: name, borrowerPhone: phone, borrowerOrg: org, dueDate: due, purpose }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr(d?.message || 'ส่งคำขอไม่สำเร็จ'); return }
      setDone(true)
    } finally { setSaving(false) }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15'
  const req = <span className="text-[#C13540]">*</span>

  return (
    <div className="min-h-screen bg-[#EEF2F7] px-4 py-8 flex justify-center">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-[#EA580C] text-white grid place-items-center text-[18px] font-bold shrink-0">K</span>
          <div>
            <div className="text-[18px] font-bold text-[#1C1917] leading-tight">ขอยืมอุปกรณ์</div>
            <div className="text-[12.5px] text-[#8492A6]">BMS · กรอกข้อมูลเพื่อส่งคำขอ เจ้าหน้าที่จะติดต่อกลับ</div>
          </div>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-[44px] mb-2">✅</div>
            <div className="text-[17px] font-bold text-[#157F4C] mb-1">ส่งคำขอเรียบร้อย</div>
            <p className="text-[13.5px] text-[#5A6B82]">เจ้าหน้าที่ได้รับคำขอของคุณแล้ว จะเลือกอุปกรณ์และติดต่อกลับตามเบอร์ที่ให้ไว้ครับ</p>
            <button onClick={() => { setDone(false); setName(''); setPhone(''); setOrg(''); setDue(''); setPurpose('') }}
              className="mt-5 text-[13px] font-semibold text-[#EA580C] hover:underline">ส่งคำขออีกรายการ</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-[#5A6B82] mb-1.5">ชื่อ-นามสกุล {req}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อผู้ยืม" className={field} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5A6B82] mb-1.5">เบอร์โทร {req}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" inputMode="tel" className={`${field} tnum`} />
              {phone && !phoneOk && <div className="text-[12px] text-[#C13540] mt-1">ต้องเป็นตัวเลข 9-10 หลัก</div>}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5A6B82] mb-1.5">หน่วยงาน / สังกัด</label>
              <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="เช่น โรงพยาบาล / แผนก" className={field} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5A6B82] mb-1.5">กำหนดคืน (ที่ต้องการ)</label>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} tnum`} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#5A6B82] mb-1.5">วัตถุประสงค์ / อุปกรณ์ที่ต้องการ</label>
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="เช่น ขอยืม Mini Kiosk 1 เครื่อง ไปสาธิตงานที่ รพ. …" className={`${field} resize-none`} />
            </div>

            {err && <div className="text-[13px] text-[#C13540] bg-[#FBE4E4] rounded-lg px-3 py-2">{err}</div>}

            <button onClick={submit} disabled={!ready || saving}
              className="bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-3 text-[15px] hover:bg-[#C2410C] disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? 'กำลังส่ง…' : 'ส่งคำขอยืม'}
            </button>
            {!ready && <p className="text-[12px] text-[#8492A6] text-center">กรอกชื่อและเบอร์โทรให้ครบก่อนส่ง · การเลือกรุ่น/serial เจ้าหน้าที่จะเป็นผู้เลือกให้</p>}
          </div>
        )}
      </div>
    </div>
  )
}
