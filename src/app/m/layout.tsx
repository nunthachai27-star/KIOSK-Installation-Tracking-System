import Link from 'next/link'
import { auth } from '@/lib/auth'
import { MobileAccountMenu } from '@/components/MobileAccountMenu'

const ROLE_LABEL: Record<string, string> = {
  OFFICE: 'เจ้าหน้าที่สำนักงาน', FIELD: 'เจ้าหน้าที่ภาคสนาม', TECHNICIAN: 'ช่างเทคนิค',
  ADMIN: 'ผู้ดูแลระบบ', EXECUTIVE: 'ผู้บริหาร', SYSTEM_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const role = ROLE_LABEL[session?.user?.role ?? ''] ?? 'ผู้ใช้งาน'

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F6F8FB] flex flex-col relative">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-[#E7EDF4] px-6 py-2 flex items-center justify-between">
          <Link
            href="/m"
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[var(--brand)]"
          >
            <span className="text-xl">🗂️</span>
            <span className="text-[11px] font-semibold">งาน</span>
          </Link>

          <Link
            href="/m"
            className="w-14 h-14 -mt-6 rounded-full bg-[var(--brand)] text-white grid place-items-center text-2xl font-bold shadow-lg shadow-[var(--brand)]/40"
            aria-label="เพิ่มงาน"
          >
            ＋
          </Link>

          <MobileAccountMenu name={name} role={role} />
        </nav>
      </div>
    </div>
  )
}
