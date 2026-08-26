import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getDevSettings, serializeWithImages, REQUEST_INCLUDE } from '@/lib/devRequestServer'
import { DevBoard } from '@/components/DevBoard'

export const dynamic = 'force-dynamic'

export default async function DevPage() {
  const session = await auth()
  const [rows, settings] = await Promise.all([
    prisma.devRequest.findMany({ orderBy: { createdAt: 'desc' }, include: REQUEST_INCLUDE }),
    getDevSettings(session?.user?.name),
  ])
  const initial = await serializeWithImages(rows)
  const publicBase = process.env.AUTH_URL || ''

  return (
    <div className="p-4 sm:p-6 max-w-[1240px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_14%,#fff)] grid place-items-center text-[var(--brand)]">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 4.5 4 9l4.5 4.5M11.5 4.5 16 9l-4.5 4.5" /></svg>
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">คำขอพัฒนา</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">แจ้งบั๊ก / ขอฟีเจอร์ใหม่ให้ทีมพัฒนา แล้วติดตามสถานะการดำเนินงานร่วมกันได้ในที่เดียว · ส่งลิงก์ให้ทีมพัฒนาอัปเดตงานได้</p>
        </div>
      </div>
      <DevBoard initial={initial} mode="staff" token={settings.token} teamNote={settings.teamNote} publicBase={publicBase} />
    </div>
  )
}
