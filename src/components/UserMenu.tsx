'use client'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Avatar, type AvatarData } from './Avatar'
import { AvatarEditor } from './AvatarEditor'
import { ThemePicker } from './ThemePicker'

// Avatar + name + role in the header, opening a dropdown with change-password + sign-out.
export function UserMenu({ userId, name, role, avatar, theme, bg, leadsUnread = 0 }: { userId: string; name: string; role: string; avatar: AvatarData; theme: string | null; bg: string | null; leadsUnread?: number }) {
  const router = useRouter()
  const [unread, setUnread] = useState(leadsUnread)
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [kioskSub, setKioskSub] = useState(false)
  const [prodSub, setProdSub] = useState(false)
  const [copiedP, setCopiedP] = useState(false)
  const [leadsOpen, setLeadsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[#F6F9FC]">
        {unread > 0 && (
          <span className="absolute -top-0.5 left-5 z-10 min-w-[17px] h-[17px] px-1 rounded-full bg-[#C13540] text-white text-[10px] font-bold grid place-items-center border-2 border-white" title={`มีผู้สนใจใหม่ ${unread} ราย`}>{unread > 9 ? '9+' : unread}</span>
        )}
        <Avatar user={{ name, ...avatar }} size={32} />
        <span className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold text-[#1C1917] max-w-[140px] truncate">{name}</span>
          <span className="text-[11px] text-[#8492A6]">{role}</span>
        </span>
        <span className={`text-[#A8A29E] text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#ECEFF3] shadow-[0_12px_40px_-12px_rgba(18,45,90,0.3)] p-1.5 z-30">
          <div className="px-3 py-2 border-b border-[#F1F3F6] mb-1">
            <div className="text-[13px] font-semibold text-[#1C1917] truncate">{name}</div>
            <div className="text-[11.5px] text-[#8492A6]">{role}</div>
          </div>
          <Link href="/report" onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            📋 สรุปงาน
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            ⚙️ ตั้งค่า
          </Link>
          <Link href="/logs" onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🧾 Log การใช้งาน
          </Link>
          <button onClick={() => { setOpen(false); setAvatarOpen(true) }}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🖼️ รูปโปรไฟล์
          </button>
          <button onClick={() => { setOpen(false); setThemeOpen(true) }}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🎨 ธีมสีเว็บ
          </button>
          <button onClick={() => setKioskSub((v) => !v)}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🎛️ ออกแบบปุ่ม Kiosk
            <span className={`ml-auto text-[#A8A29E] text-[10px] transition-transform ${kioskSub ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {kioskSub && (
            <div className="ml-4 pl-1 border-l border-[#ECEFF3]">
              <a href="/kiosk-buttons" target="_blank" rel="noopener" onClick={() => setOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
                🎨 เปิดหน้าออกแบบ
              </a>
              <button onClick={() => {
                  try {
                    navigator.clipboard.writeText(`${location.origin}/kiosk-buttons`)
                    setCopied(true); setTimeout(() => setCopied(false), 2000)
                  } catch { /* clipboard may be blocked — ignore */ }
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#5A6B82] hover:bg-[#F0EEEC] flex items-center gap-2">
                {copied ? '✓ คัดลอกลิงก์แล้ว' : '🔗 คัดลอกลิงก์สาธารณะ'}
              </button>
              <button onClick={() => { setOpen(false); setLogOpen(true) }}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#5A6B82] hover:bg-[#F0EEEC] flex items-center gap-2">
                📊 บันทึก รพ. ที่ใช้ออกแบบ
              </button>
            </div>
          )}
          <button onClick={() => setProdSub((v) => !v)}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🖥️ โปรดัก Kiosk
            {unread > 0 && <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#C13540] text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
            <span className={`ml-auto text-[#A8A29E] text-[10px] transition-transform ${prodSub ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {prodSub && (
            <div className="ml-4 pl-1 border-l border-[#ECEFF3]">
              <a href="/kiosk-products" target="_blank" rel="noopener" onClick={() => setOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
                🖥️ เปิดหน้าโชว์เคส
              </a>
              <button onClick={() => {
                  try { navigator.clipboard.writeText(`${location.origin}/kiosk-products`); setCopiedP(true); setTimeout(() => setCopiedP(false), 2000) } catch { /* ignore */ }
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#5A6B82] hover:bg-[#F0EEEC] flex items-center gap-2">
                {copiedP ? '✓ คัดลอกลิงก์แล้ว' : '🔗 คัดลอกลิงก์โปรดัก'}
              </button>
              <button onClick={() => { setOpen(false); setLeadsOpen(true); setUnread(0) }}
                className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#5A6B82] hover:bg-[#F0EEEC] flex items-center gap-2">
                📋 รายชื่อผู้สนใจ
                {unread > 0 && <span className="ml-auto min-w-[17px] h-[17px] px-1 rounded-full bg-[#C13540] text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
              </button>
            </div>
          )}
          <button onClick={() => { setOpen(false); setPwOpen(true) }}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#3C4A5E] hover:bg-[#F0EEEC] flex items-center gap-2">
            🔑 เปลี่ยนรหัสผ่าน
          </button>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-[#C13540] hover:bg-[#FBE4E4] flex items-center gap-2">
            ⎋ ออกจากระบบ
          </button>
        </div>
      )}

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
      {avatarOpen && <AvatarEditor userId={userId} name={name} current={avatar}
        onClose={() => setAvatarOpen(false)} onSaved={() => { setAvatarOpen(false); router.refresh() }} />}
      {themeOpen && <ThemePicker userId={userId} current={theme} currentBg={bg} onClose={() => setThemeOpen(false)} />}
      {logOpen && <KioskLogModal onClose={() => setLogOpen(false)} />}
      {leadsOpen && <KioskLeadsModal onClose={() => setLeadsOpen(false)} />}
    </div>
  )
}

// รายชื่อผู้สนใจโปรดัก Kiosk (leads) — เฉพาะเจ้าหน้าที่ (API ตรวจสิทธิ์อยู่แล้ว)
type Lead = { id: string; productName: string | null; hospital: string; contact: string | null; phone: string | null; email: string | null; note: string | null; createdAt: string }
function KioskLeadsModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Lead[] | null>(null)
  const [err, setErr] = useState('')
  async function load() {
    setErr(''); setRows(null)
    try {
      const res = await fetch('/api/kiosk-products/leads', { cache: 'no-store' })
      if (!res.ok) { setErr('โหลดข้อมูลไม่สำเร็จ'); setRows([]); return }
      const d = await res.json(); setRows(d.leads || [])
    } catch { setErr('เชื่อมต่อไม่ได้'); setRows([]) }
  }
  useEffect(() => { load() }, [])
  const fmt = (s: string) => { try { return new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' } }

  const modal = (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[16px] font-bold text-[#1C1917]">📋 รายชื่อผู้สนใจโปรดัก Kiosk</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12.5px] text-[#8492A6]">รวม <b className="text-[#1C1917]">{rows?.length ?? 0}</b> รายการ (ล่าสุด 500)</div>
          <button onClick={load} className="text-[12.5px] font-semibold text-[var(--brand)] hover:underline">รีเฟรช</button>
        </div>
        {err && <div className="text-sm text-[#C13540] mb-2">{err}</div>}
        <div className="overflow-auto border border-[#ECEFF3] rounded-xl">
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 bg-[#F7FAFD]">
              <tr className="text-left text-[11.5px] text-[#5A6B82]">
                <th className="px-3 py-2 font-bold">วันที่</th>
                <th className="px-3 py-2 font-bold">โรงพยาบาล/หน่วยงาน</th>
                <th className="px-3 py-2 font-bold">สนใจรุ่น</th>
                <th className="px-3 py-2 font-bold">ผู้ติดต่อ</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">เบอร์/อีเมล</th>
                <th className="px-3 py-2 font-bold">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-[#9AAABF]">กำลังโหลด…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-[#9AAABF]">ยังไม่มีผู้สนใจ</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-[#F1F3F6] hover:bg-[#F7FAFD] align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-[#5A6B82]">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2 font-semibold text-[#1C1917]">{r.hospital}</td>
                  <td className="px-3 py-2 text-[#3C4A5E]">{r.productName || '—'}</td>
                  <td className="px-3 py-2 text-[#3C4A5E]">{r.contact || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#3C4A5E]">
                    {r.phone && <div>{r.phone}</div>}
                    {r.email && <div className="text-[11.5px] text-[#8492A6]">{r.email}</div>}
                    {!r.phone && !r.email && '—'}
                  </td>
                  <td className="px-3 py-2 text-[#5A6B82] max-w-[220px] whitespace-pre-wrap">{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// บันทึกการใช้งานเครื่องมือออกแบบปุ่ม Kiosk — รายชื่อโรงพยาบาลที่ลงทะเบียนใช้งาน
// (เฉพาะเจ้าหน้าที่ที่ล็อกอิน — API /log บังคับ session อยู่แล้ว).
type LogRow = { hospital: string; count: number; registeredAt: string; lastAt: string }
function KioskLogModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<LogRow[] | null>(null)
  const [sum, setSum] = useState({ hospitals: 0, total: 0 })
  const [err, setErr] = useState('')

  async function load() {
    setErr(''); setRows(null)
    try {
      const res = await fetch('/api/kiosk-buttons/log', { cache: 'no-store' })
      if (!res.ok) { setErr('โหลดข้อมูลไม่สำเร็จ'); setRows([]); return }
      const d = await res.json()
      setRows(d.rows || []); setSum({ hospitals: d.hospitals || 0, total: d.total || 0 })
    } catch { setErr('เชื่อมต่อไม่ได้'); setRows([]) }
  }
  useEffect(() => { load() }, [])
  const fmt = (s: string) => { try { return new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' } }

  const modal = (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[16px] font-bold text-[#1C1917]">📊 บันทึก รพ. ที่ใช้ออกแบบปุ่ม Kiosk</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[12.5px] text-[#8492A6]">
            รวม <b className="text-[#1C1917]">{sum.hospitals}</b> โรงพยาบาล · <b className="text-[#1C1917]">{sum.total}</b> ดีไซน์
          </div>
          <button onClick={load} className="text-[12.5px] font-semibold text-[var(--brand)] hover:underline">รีเฟรช</button>
        </div>
        <div className="text-[11.5px] text-[#9AAABF] mb-3">คลิกชื่อโรงพยาบาลที่มีดีไซน์ เพื่อเปิดดูผลงานของที่นั่น</div>

        {err && <div className="text-sm text-[#C13540] mb-2">{err}</div>}
        <div className="overflow-auto border border-[#ECEFF3] rounded-xl">
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 bg-[#F7FAFD]">
              <tr className="text-left text-[11.5px] text-[#5A6B82]">
                <th className="px-3 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">โรงพยาบาล</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">ดีไซน์</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">ลงทะเบียนเมื่อ</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">ใช้ล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-[#9AAABF]">กำลังโหลด…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-[#9AAABF]">ยังไม่มีโรงพยาบาลลงทะเบียนใช้งาน</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-t border-[#F1F3F6] hover:bg-[#F7FAFD]">
                  <td className="px-3 py-2 text-[#8492A6]">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-[#1C1917]">
                    {r.count > 0 ? (
                      <a href={`/kiosk-buttons?hospital=${encodeURIComponent(r.hospital)}`} target="_blank" rel="noopener"
                        title="เปิดดูดีไซน์ของโรงพยาบาลนี้"
                        className="text-[var(--brand)] hover:underline">{r.hospital} <span className="text-[10px]">↗</span></a>
                    ) : (
                      <span>{r.hospital} <span className="text-[10.5px] font-normal text-[#B6C0CE]">(ยังไม่มีดีไซน์)</span></span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#5A6B82]">{fmt(r.registeredAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#5A6B82]">{fmt(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const ready = current && next.length >= 4 && next === confirm && next !== current

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErr(d?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
        return
      }
      setDone(true)
    } finally { setSaving(false) }
  }

  const field = 'w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15'

  const modal = (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold text-[#1C1917]">🔑 เปลี่ยนรหัสผ่าน</div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-[#5A6B82] hover:bg-[#F0EEEC]">✕</button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[#157F4C] bg-[#F2FAF5] border border-[#DCF0E4] rounded-lg px-3 py-3">
              ✓ เปลี่ยนรหัสผ่านเรียบร้อย — ครั้งต่อไปให้ใช้รหัสใหม่ล็อกอิน
            </div>
            <button onClick={onClose} className="bg-[var(--brand)] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)]">ปิด</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสผ่านปัจจุบัน</label>
              <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">รหัสผ่านใหม่ <span className="font-normal text-[#8492A6]">(อย่างน้อย 4 ตัว)</span></label>
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5A6B82] mb-1.5">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              {confirm && next !== confirm && <div className="text-[11.5px] text-[#C13540] mt-1">รหัสผ่านใหม่ไม่ตรงกัน</div>}
              {next && next === current && <div className="text-[11.5px] text-[#C13540] mt-1">รหัสผ่านใหม่ต้องต่างจากเดิม</div>}
            </div>
            {err && <div className="text-sm text-[#C13540]">{err}</div>}
            <div className="flex items-center gap-2 mt-1">
              <button type="submit" disabled={!ready || saving}
                className="bg-[var(--brand)] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
              </button>
              <button type="button" onClick={onClose} className="text-[13px] font-semibold text-[#5A6B82] px-3 py-2.5 hover:text-[#1C1917]">ยกเลิก</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
