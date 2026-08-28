import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OfficeNav } from '@/components/OfficeNav'
import { BrandRefresh } from '@/components/BrandRefresh'
import { RunningCritter } from '@/components/RunningCritter'
import { LeadNotifier } from '@/components/LeadNotifier'
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
  const role = ROLE_LABEL[session?.user?.role ?? ''] ?? 'ผู้ใช้งาน'

  // Attention counts for the notification bell + the current user's avatar.
  const now = new Date()
  const [pendingClaims, overdue, overdueLoans, me, leadsUnread] = await Promise.all([
    prisma.issue.count({ where: { status: 'RECEIVED' } }),
    prisma.job.count({ where: { isPlanned: false, deliveryDueDate: { lt: now }, currentStatus: { notIn: ['CLOSED', 'CANCELLED'] } } }),
    prisma.loan.count({ where: { status: 'BORROWED', dueDate: { lt: now } } }),
    session?.user?.id ? prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true, avatarIcon: true, avatarColor: true, theme: true, bg: true } }) : Promise.resolve(null),
    prisma.kioskLead.count({ where: { seenAt: null } }),
  ])

  return (
    <div className="min-h-screen">
      <header className="bg-white/90 backdrop-blur border-b border-[#E7EDF4] sticky top-0 z-20 shadow-[0_1px_0_rgba(18,45,90,0.03),0_6px_20px_-16px_rgba(18,45,90,0.25)]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BrandRefresh />
            <div className="hidden md:block">
              <OfficeNav />
            </div>
          </div>
          {/* desktop actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/jobs/new"
              className="ds-hover bg-[var(--brand)] text-white text-sm font-semibold rounded-[10px] px-4 py-2 hover:bg-[var(--brand-strong)] shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]"
            >
              ＋ เพิ่มงาน
            </Link>
            <NotificationBell pendingClaims={pendingClaims} overdue={overdue} overdueLoans={overdueLoans} />
            <span className="w-px h-6 bg-[#ECEFF3]" />
            <UserMenu userId={session?.user?.id ?? ''} name={name} role={role} theme={me?.theme ?? null} bg={me?.bg ?? null}
              leadsUnread={leadsUnread}
              avatar={{ avatarUrl: me?.avatarUrl, avatarIcon: me?.avatarIcon, avatarColor: me?.avatarColor }} />
          </div>
          {/* mobile menu */}
          <MobileMenu userId={session?.user?.id ?? ''} name={name} theme={me?.theme ?? null} bg={me?.bg ?? null}
            avatar={{ avatarUrl: me?.avatarUrl, avatarIcon: me?.avatarIcon, avatarColor: me?.avatarColor }} />
        </div>
      </header>
      {children}
      <RunningCritter />
      <LeadNotifier />
    </div>
  )
}
