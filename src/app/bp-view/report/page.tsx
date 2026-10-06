import Link from 'next/link'
import { BpPersonReport } from '@/components/BpPersonReport'
import { BpViewLogin, BpViewLogout } from '@/components/BpViewLogin'
import { isBpViewer } from '@/lib/bpViewAuth'

export const dynamic = 'force-dynamic'

export default async function BpViewReportPage() {
  if (!(await isBpViewer())) return <BpViewLogin />

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/bp-view" className="text-[#5A6B82] hover:text-[var(--brand)]">‹ เดชบอร์ดทดสอบ</Link>
        <span className="text-[#C7D2E0]">/</span>
        <h1 className="text-xl font-bold text-[#1C1917] flex-1">รายงาน / เทียบเครื่อง</h1>
        <BpViewLogout />
      </div>
      <div className="text-[12px] text-[#8492A6] bg-[#F8FAFD] border border-[#EEF2F8] rounded-lg px-3 py-2">👁️ โหมดดูอย่างเดียว — ไม่สามารถลบหรือแก้ไขข้อมูลได้</div>
      <BpPersonReport canDelete={false} />
    </div>
  )
}
