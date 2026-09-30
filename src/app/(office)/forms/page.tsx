import Link from 'next/link'
import { FormBuilder } from '@/components/FormBuilder'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams
  const session = await auth()
  // ผูก "การจำรูปแบบฟอร์ม" ไว้กับผู้ใช้ — ของใครของมัน
  const userId = session?.user?.id ?? 'anon'
  return (
    <>
      {/* ฟอร์มพิเศษ: ดึงรายการตามเดือนอัตโนมัติ (ไม่ใช่แบบแก้มือเหมือน template ด้านล่าง) */}
      <div className="px-4 pt-4">
        <Link href="/forms/shipping"
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE4EE] bg-white px-4 py-3 text-[14px] font-semibold text-[#1C1917] hover:border-[var(--brand)] hover:text-[var(--brand)] shadow-sm">
          🚚 ฟอร์มค่าขนส่ง (รายเดือน)
          <span className="text-[12px] font-normal text-[#8492A6]">ดึงรายการจัดส่งตามเดือนอัตโนมัติ + โหลด Excel</span>
        </Link>
      </div>
      <FormBuilder initialJobId={job} userId={userId} />
    </>
  )
}
