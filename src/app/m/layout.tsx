import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/SignOutButton'

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#EDEDF5] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#EDEDF5] flex flex-col relative">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-[#DEDDEC] px-6 py-2 flex items-center justify-between">
          <Link
            href="/m"
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[#4C4FE6]"
          >
            <span className="text-xl">🗂️</span>
            <span className="text-[11px] font-semibold">งาน</span>
          </Link>

          <Link
            href="/m"
            className="w-14 h-14 -mt-6 rounded-full bg-[#4C4FE6] text-white grid place-items-center text-2xl font-bold shadow-lg shadow-[#4C4FE6]/40"
            aria-label="เพิ่มงาน"
          >
            ＋
          </Link>

          <div className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[#8E8FB0]">
            <span className="w-6 h-6 rounded-full bg-[#4C4FE6] text-white grid place-items-center text-[11px] font-bold">
              {initial}
            </span>
            <span className="text-[11px] font-semibold">ฉัน</span>
            <SignOutButton />
          </div>
        </nav>
      </div>
    </div>
  )
}
