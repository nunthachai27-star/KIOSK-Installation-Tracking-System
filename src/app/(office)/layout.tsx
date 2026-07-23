import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OfficeNav } from '@/components/OfficeNav'
import { MobileMenu } from '@/components/MobileMenu'
import { NotificationBell } from '@/components/NotificationBell'
import { UserMenu } from '@/components/UserMenu'

const ROLE_LABEL: Record<string, string> = {
  OFFICE: 'เจ้าหน้าที่สำนักงาน',
  FIELD: 'เจ้าหน้าที่ภาคสนาม',
  TECHNICIAN: 'ช่างเทคนิค',
  ADMIN: 'ผู้ดูแลระบบ',
  EXECUTIVE: 'ผู้บริหาร',
  SYSTEM_ADMIN: 'ผู้ดูแลระบบสูงสุด',
}

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const role = ROLE_LABEL[session?.user?.role ?? ''] ?? 'ผู้ใช้งาน'

  // Attention counts for the notification bell.
  const now = new Date()
  const [pendingClaims, overdue, overdueLoans] = await Promise.all([
    prisma.issue.count({ where: { status: 'RECEIVED' } }),
    prisma.job.count({ where: { isPlanned: false, deliveryDueDate: { lt: now }, currentStatus: { notIn: ['CLOSED', 'CANCELLED'] } } }),
    prisma.loan.count({ where: { status: 'BORROWED', dueDate: { lt: now } } }),
  ])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-white/90 backdrop-blur border-b border-[#E7EDF4] sticky top-0 z-20 shadow-[0_1px_0_rgba(18,45,90,0.03),0_6px_20px_-16px_rgba(18,45,90,0.25)]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group" title="แดชบอร์ด">
              <span className="ds-logo w-8 h-8 rounded-[10px] text-white grid place-items-center font-bold text-sm transition-transform group-hover:scale-105">K</span>
              <span className="font-bold text-base tracking-tight">KIOSK</span>
            </Link>
            <div className="hidden md:block">
              <OfficeNav />
            </div>
          </div>
          {/* desktop actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/jobs/new"
              className="ds-hover bg-[#EA580C] text-white text-sm font-semibold rounded-[10px] px-4 py-2 hover:bg-[#C2410C] shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]"
            >
              ＋ เพิ่มงาน
            </Link>
            <NotificationBell pendingClaims={pendingClaims} overdue={overdue} overdueLoans={overdueLoans} />
            <span className="w-px h-6 bg-[#ECEFF3]" />
            <UserMenu name={name} initial={initial} role={role} />
          </div>
          {/* mobile menu */}
          <MobileMenu initial={initial} />
        </div>
      </header>
      {children}
    </div>
  )
}
