import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/SignOutButton'
import { OfficeNav } from '@/components/OfficeNav'

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <header className="bg-white border-b border-[#E7EDF4]">
        <div className="max-w-[1160px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#2F6BED] text-white grid place-items-center font-bold text-sm">K</span>
              <span className="font-bold text-base">KIOSK</span>
            </div>
            <OfficeNav />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/jobs/new"
              className="bg-[#2F6BED] text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-[#2558C5]"
            >
              ＋ เพิ่มงาน
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#2F6BED] text-white grid place-items-center font-bold text-sm">
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
