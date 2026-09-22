import Link from 'next/link'
import { IngestMonitor } from '@/components/IngestMonitor'

export const dynamic = 'force-dynamic'

// มอนิเตอร์การรับข้อมูลจากเครื่อง (สำหรับเจ้าหน้าที่) — ดูเรียลไทม์ว่าเครื่องไหนส่งอะไรเข้ามา + log
export default function IngestMonitorPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_14%,#fff)] grid place-items-center text-[22px]">🖥️</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1C1917]">มอนิเตอร์การรับข้อมูลจากเครื่อง</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">ดูแบบเรียลไทม์ว่ามีเครื่องไหนยิงข้อมูลเข้าเว็บบ้าง (ความดัน/ไขมัน) พร้อม log ย้อนหลัง</p>
        </div>
        <Link href="/dev" className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold whitespace-nowrap">← กลับหน้าพัฒนา</Link>
      </div>
      <IngestMonitor />
    </div>
  )
}
