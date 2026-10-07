'use client'
import { useState } from 'react'
import { confirmDialog } from '@/lib/dialog'

type Role = 'OFFICE' | 'FIELD' | 'VIEWER' | 'EXECUTIVE' | 'TECHNICIAN' | 'ADMIN' | 'SYSTEM_ADMIN'
type User = { id: string; username: string; name: string; nickname: string | null; role: Role; active: boolean; isSuper?: boolean }

const ROLES: { value: Role; label: string; short: string }[] = [
  { value: 'OFFICE', label: 'เจ้าหน้าที่ (สำนักงาน) — แก้ไขได้', short: 'เจ้าหน้าที่' },
  { value: 'FIELD', label: 'ภาคสนาม (มือถือ)', short: 'ภาคสนาม' },
  { value: 'VIEWER', label: 'ผู้ชม — ดูได้ทุกหน้า แก้/ลบไม่ได้', short: 'ผู้ชม' },
  { value: 'EXECUTIVE', label: 'ผู้บริหาร', short: 'ผู้บริหาร' },
  { value: 'TECHNICIAN', label: 'ช่างเทคนิค', short: 'ช่าง' },
  { value: 'ADMIN', label: 'แอดมิน', short: 'แอดมิน' },
]
const roleShort = (r: Role) => ROLES.find((x) => x.value === r)?.short ?? r

const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--brand)]'

export function UsersManager({ initial }: { initial: User[] }) {
  const [users, setUsers] = useState<User[]>(initial)
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('VIEWER')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function add() {
    setBusy(true); setErr(''); setMsg('')
    try {
      const r = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, nickname, password, role }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.message || 'เพิ่มไม่สำเร็จ'); return }
      setUsers((x) => [j.user, ...x])
      setMsg(`เพิ่มผู้ใช้ "${j.user.username}" แล้ว`)
      setUsername(''); setName(''); setNickname(''); setPassword(''); setRole('VIEWER'); setOpen(false)
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setErr(''); setMsg('')
    const r = await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    if (!r.ok) { setErr(j?.message || 'บันทึกไม่สำเร็จ'); return false }
    if (j?.user) setUsers((x) => x.map((u) => (u.id === id ? { ...u, ...j.user } : u)))
    setMsg(okMsg)
    return true
  }

  async function changeRole(u: User, role: Role) {
    await patch(u.id, { role }, `เปลี่ยนสิทธิ์ ${u.username} → ${roleShort(role)} แล้ว`)
  }
  async function toggleActive(u: User) {
    const ok = await confirmDialog({ title: u.active ? 'ปิดใช้งานบัญชี' : 'เปิดใช้งานบัญชี', message: `${u.active ? 'ปิด' : 'เปิด'}ใช้งาน "${u.username}"?`, danger: u.active, confirmText: u.active ? 'ปิด' : 'เปิด' })
    if (!ok) return
    await patch(u.id, { active: !u.active }, `${u.active ? 'ปิด' : 'เปิด'}ใช้งาน ${u.username} แล้ว`)
  }
  async function resetPass(u: User) {
    const p = window.prompt(`ตั้งรหัสผ่านใหม่ให้ "${u.username}" (อย่างน้อย 4 ตัว)`)
    if (p == null) return
    if (p.length < 4) { setErr('รหัสผ่านอย่างน้อย 4 ตัว'); return }
    await patch(u.id, { password: p }, `รีเซ็ตรหัสผ่าน ${u.username} แล้ว`)
  }

  const canAdd = /^[a-z0-9._-]{3,30}$/.test(username) && name.trim() && password.length >= 4

  return (
    <div className="flex flex-col gap-4">
      {/* เพิ่มผู้ใช้ */}
      <div className="ds-card p-4">
        {!open ? (
          <button onClick={() => { setOpen(true); setErr(''); setMsg('') }} className="text-[14px] font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">＋ เพิ่มผู้ใช้</button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-bold mb-1">เพิ่มผู้ใช้ใหม่</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อผู้ใช้ (a-z 0-9 . _ -)" className={field} autoCapitalize="none" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" className={field} />
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น (ถ้ามี)" className={field} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน (อย่างน้อย 4 ตัว)" className={field} />
            </div>
            <label className="text-[12.5px] font-semibold text-[#5A6B82]">สิทธิ์ (role)
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${field} mt-1`}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <div className="flex gap-2 mt-1">
              <button onClick={add} disabled={busy || !canAdd} className="text-[13px] font-semibold px-5 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E] disabled:opacity-50">{busy ? 'กำลังเพิ่ม…' : 'บันทึก'}</button>
              <button onClick={() => setOpen(false)} className="text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-[#DCE4EE] text-[#5A6B82]">ยกเลิก</button>
            </div>
          </div>
        )}
      </div>

      {err && <div className="text-[12.5px] text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4] rounded-lg px-3 py-2">{err}</div>}
      {msg && <div className="text-[12.5px] text-[#157F4C] bg-[#EAF7EF] border border-[#BFE6CE] rounded-lg px-3 py-2">✓ {msg}</div>}

      {/* รายชื่อผู้ใช้ */}
      <div className="ds-card overflow-hidden">
        <div className="text-[12.5px] text-[#8492A6] px-4 py-2.5 border-b border-[#EEF2F8]">{users.length} ผู้ใช้</div>
        {users.map((u) => (
          <div key={u.id} className={`flex items-center gap-2 px-4 py-2.5 border-t border-[#EEF2F8] flex-wrap ${u.active ? '' : 'bg-[#FAFAFA] opacity-70'}`}>
            <div className="flex-1 min-w-[160px]">
              <div className="text-[13.5px] font-semibold text-[#1C1917] flex items-center gap-1.5 flex-wrap">
                {u.name}{u.nickname ? ` (${u.nickname})` : ''}
                {u.isSuper && <span className="text-[10.5px] font-bold text-[#7A44C6] bg-[#F1E9FB] border border-[#E0D0F5] rounded px-1.5 py-0.5">🔐 super admin</span>}
                {!u.active && <span className="text-[11px] text-[#A2AEC0]">· ปิดใช้งาน</span>}
              </div>
              <div className="text-[11.5px] text-[#8492A6]">@{u.username}</div>
            </div>
            <select value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}
              className="text-[12.5px] border border-[#D6DFEA] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--brand)]">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.short}</option>)}
              {!ROLES.some((r) => r.value === u.role) && <option value={u.role}>{u.role}</option>}
            </select>
            <button onClick={() => resetPass(u)} className="text-[12px] font-semibold text-[#5A6B82] hover:text-[var(--brand)] px-2 py-1.5">รีเซ็ตรหัส</button>
            <button onClick={() => toggleActive(u)} className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-lg ${u.active ? 'text-[#C13540] hover:bg-[#FBE4E4]' : 'text-[#157F4C] hover:bg-[#EAF7EF]'}`}>{u.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
