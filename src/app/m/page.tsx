import { auth } from '@/lib/auth'
import { dayRange, getActivitiesBetween } from '@/lib/activities'
import { MobileTaskCard } from '@/components/MobileTaskCard'

export default async function MobileHomePage() {
  const session = await auth()
  const name = session?.user?.name ?? ''
  const now = new Date()
  const { from, to } = dayRange(now)
  const userId = session?.user?.role === 'FIELD' ? session.user.id : undefined
  const activities = await getActivitiesBetween(from, to, userId)

  const dateLabel = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="px-5 pt-6">
      <div className="mb-1 text-[13px] text-[#8492A6]">{dateLabel}</div>
      <h1 className="text-xl font-bold text-[#1C1917]">สวัสดี, {name}</h1>
      <p className="mt-1 text-sm font-semibold text-[#EA580C]">งานวันนี้ {activities.length} งาน</p>

      <div className="mt-4 flex flex-col gap-3">
        {activities.length === 0 && (
          <div className="text-center text-sm text-[#8492A6] bg-white rounded-2xl border border-[#E7EDF4] py-10">
            วันนี้ไม่มีงานที่ต้องดำเนินการ
          </div>
        )}
        {activities.map((activity) => (
          <MobileTaskCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  )
}
