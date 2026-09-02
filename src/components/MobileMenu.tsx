'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { NAV_ITEMS } from './OfficeNav'
import { Avatar, type AvatarData } from './Avatar'
import { AvatarEditor } from './AvatarEditor'
import { ThemePicker } from './ThemePicker'

/** Mobile-only header menu: an avatar + hamburger that opens a dropdown with
 * the nav links, "เพิ่มงาน", and sign-out. Hidden from md upwards. */
export function MobileMenu({ userId, name, avatar, theme, bg }: { userId: string; name: string; avatar: AvatarData; theme: string | null; bg: string | null }) {
  const [open, setOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const path = usePathname()
  const router = useRouter()
  const close = () => setOpen(false)

  return (
    <div className="md:hidden relative flex items-center gap-2">
      <button onClick={() => setAvatarOpen(true)} title="รูปโปรไฟล์" className="shrink-0">
        <Avatar user={{ name, ...avatar }} size={32} />
      </button>
      <button
        type="button"
        aria-label="เมนู"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 grid place-items-center rounded-lg border border-[#E1E8F2] text-[#3C4A5E] hover:bg-[#F6F9FC] active:scale-95 transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-16 bg-black/20 z-30" onClick={close} />
          <div className="absolute right-0 top-full mt-3 z-40 w-56 max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain bg-white rounded-2xl border border-[#E7EDF4] shadow-[0_16px_40px_-12px_rgba(18,45,90,0.35)] p-2 flex flex-col">
            {NAV_ITEMS.map((it) => {
              const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={close}
                  className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                    active ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[#3C4A5E] hover:bg-[#F6F9FC]'
                  }`}
                >
                  {it.label}
                </Link>
              )
            })}
            <div className="h-px bg-[#EEF2F8] my-1.5" />
            <button
              type="button"
              onClick={() => { close(); setAvatarOpen(true) }}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC] text-left"
            >
              🖼️ รูปโปรไฟล์
            </button>
            <button
              type="button"
              onClick={() => { close(); setThemeOpen(true) }}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC] text-left"
            >
              🎨 ธีมสีเว็บ
            </button>
            <Link
              href="/dashboard"
              onClick={close}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC]"
            >
              📊 แดชบอร์ด
            </Link>
            <Link
              href="/report"
              onClick={close}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC]"
            >
              📋 สรุปงาน
            </Link>
            <Link
              href="/settings"
              onClick={close}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC]"
            >
              ⚙️ ตั้งค่า
            </Link>
            <Link
              href="/logs"
              onClick={close}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#3C4A5E] hover:bg-[#F6F9FC]"
            >
              🧾 Log การใช้งาน
            </Link>
            <Link
              href="/jobs/new"
              onClick={close}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand)] text-white text-center hover:bg-[var(--brand-strong)]"
            >
              ＋ เพิ่มงาน
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-1 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#5A6B82] hover:bg-[#FBE4E4] hover:text-[#C13540] text-left"
            >
              ออกจากระบบ
            </button>
          </div>
        </>
      )}

      {avatarOpen && <AvatarEditor userId={userId} name={name} current={avatar}
        onClose={() => setAvatarOpen(false)} onSaved={() => { setAvatarOpen(false); router.refresh() }} />}
      {themeOpen && <ThemePicker userId={userId} current={theme} currentBg={bg} onClose={() => setThemeOpen(false)} />}
    </div>
  )
}
