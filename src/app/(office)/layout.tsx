import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/SignOutButton'
import { OfficeNav } from '@/components/OfficeNav'

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-white/90 backdrop-blur border-b border-[#E7EDF4] sticky top-0 z-20 shadow-[0_1px_0_rgba(18,45,90,0.03),0_6px_20px_-16px_rgba(18,45,90,0.25)]">
        <div className="max-w-[1160px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="ds-logo w-8 h-8 rounded-[10px] text-white grid place-items-center font-bold text-sm">K</span>
              <span className="font-bold text-base tracking-tight">KIOSK</span>
            </div>
            <OfficeNav />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/jobs/new"
              className="ds-hover bg-[#2F6BED] text-white text-sm font-semibold rounded-[10px] px-4 py-2 hover:bg-[#1E51D0] shadow-[0_6px_16px_-8px_rgba(47,107,237,0.6)]"
            >
              ＋ เพิ่มงาน
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#EAF1FF] text-[#2F6BED] grid place-items-center font-bold text-sm ring-1 ring-[#DCE7FA]">
                {initial}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
