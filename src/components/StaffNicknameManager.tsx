'use client'
import { useState } from 'react'

type Staff = { id: string; name: string; nickname: string | null; role: string }
const ROLE_LABEL: Record<string, string> = {
  OFFICE: 'สำนักงาน', FIELD: 'ภาคสนาม', TECHNICIAN: 'ช่างเทคนิค', ADMIN: 'ผู้ดูแล', EXECUTIVE: 'ผู้บริหาร', SYSTEM_ADMIN: 'ผู้ดูแลสูงสุด',
}

export function StaffNicknameManager({ initial }: { initial: Staff[] }) {
  return (
    <div className="ds-card overflow-hidden">
      {initial.map((s) => <Row key={s.id} staff={s} />)}
      {initial.length === 0 && <div className="px-5 py-8 text-center text-[#8492A6] text-sm">ไม่มีเจ้าหน้าที่</div>}
    </div>
  )
}

function Row({ staff }: { staff: Staff }) {
  const [nick, setNick] = useState(staff.nickname ?? '')
  const [flash, setFlash] = useState(false)
  const saved = staff.nickname ?? ''

  async function save() {
    if (nick.trim() === saved) return
    const res = await fetch(`/api/users/${staff.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: nick }),
    })
    if (res.ok) { setFlash(true); setTimeout(() => setFlash(false), 900) }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#F1F3F6] first:border-t-0 hover:bg-[#FBFAF8]">
      <span className="w-8 h-8 shrink-0 rounded-full bg-[#FFEDE1] text-[#EA580C] grid place-items-center font-bold text-sm">{staff.name.trim().charAt(0) || '?'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#1C1917] truncate">{staff.name}</div>
        <div className="text-[11.5px] text-[#8492A6]">{ROLE_LABEL[staff.role] ?? staff.role}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-[12px] text-[#8492A6]">ชื่อเล่น</label>
        <input value={nick} onChange={(e) => setNick(e.target.value)} onBlur={save} placeholder="เช่น เสือ"
          className={`w-32 border rounded-lg px-2.5 py-1.5 text-[13px] outline-none ${flash ? 'border-[#22A565] bg-[#EAF7EF]' : 'border-[#D6DFEA] focus:border-[#EA580C]'}`} />
      </div>
    </div>
  )
}
