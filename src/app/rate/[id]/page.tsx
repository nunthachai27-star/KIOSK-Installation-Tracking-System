import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { RateForm } from '@/components/RateForm'

export const dynamic = 'force-dynamic'

export default async function RatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [issue, session] = await Promise.all([
    prisma.issue.findUnique({
      where: { id },
      select: {
        id: true, title: true, rating: true, ratingComment: true, assignedToId: true,
        hospitalName: true, assignedTo: { select: { name: true } }, reporter: { select: { name: true } }, job: { select: { hospital: { select: { name: true } } } },
      },
    }),
    auth(),
  ])

  const hospital = issue?.job?.hospital.name ?? issue?.hospitalName ?? null
  // A logged-in staff member may not rate — the resolver rating their own work is called out.
  const staffBlocked = !!session?.user
  const isSelf = session?.user?.id != null && session.user.id === issue?.assignedToId

  return (
    <div className="min-h-screen bg-[#F1F3F6] grid place-items-center p-5">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <span className="w-9 h-9 rounded-xl bg-[#EA580C] text-white grid place-items-center font-bold">K</span>
          <span className="font-bold text-[16px] tracking-tight text-[#1C1917]">KIOSK · BMS</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-[0_10px_40px_-12px_rgba(18,45,90,0.25)] p-6">
          {!issue ? (
            <div className="text-center text-[#8492A6] py-8">ไม่พบรายการประเมิน · ลิงก์อาจไม่ถูกต้อง</div>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="text-[13px] text-[#8492A6]">แบบประเมินความพึงพอใจการแก้ไขปัญหา</div>
                <div className="text-[18px] font-bold text-[#1C1917] mt-1">{issue.title}</div>
                <div className="text-[13px] text-[#5A6B82] mt-1">
                  {hospital ? `${hospital} · ` : ''}ผู้ดำเนินการ: {issue.assignedTo?.name ?? issue.reporter?.name ?? 'เจ้าหน้าที่ BMS'}
                </div>
                <div className="text-[13.5px] text-[#3C4A5E] mt-3">โปรดให้คะแนนความพึงพอใจต่อการแก้ไขปัญหาของเจ้าหน้าที่</div>
              </div>
              {staffBlocked ? (
                <div className="rounded-xl bg-[#FBEBCB] text-[#8A5A08] text-[13px] px-4 py-3.5 text-center leading-relaxed">
                  🔒 คุณกำลังเข้าสู่ระบบเป็น<b>เจ้าหน้าที่</b> — แบบประเมินนี้สำหรับ<b>โรงพยาบาล</b>เท่านั้น
                  {isSelf && <div className="mt-1 font-semibold">เจ้าหน้าที่ไม่สามารถประเมินงานของตนเองได้</div>}
                  <div className="mt-1.5 text-[12px] text-[#A16207]">กรุณาส่งลิงก์นี้ให้โรงพยาบาลเป็นผู้ประเมิน</div>
                </div>
              ) : (
                <RateForm id={issue.id} initialRating={issue.rating} initialComment={issue.ratingComment} />
              )}
            </>
          )}
        </div>
        <div className="text-center text-[12px] text-[#B8B2AC] mt-4">ระบบบันทึกและติดตามงานติดตั้ง KIOSK · BMS</div>
      </div>
    </div>
  )
}
