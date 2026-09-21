import Link from 'next/link'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { FatTestDashboard } from '@/components/FatTestDashboard'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

export default async function FatTestPage() {
  // สร้าง URL ปลายทางให้ตรงกับโดเมนที่เปิดจริง (เผื่อ AUTH_URL ไม่ได้ตั้ง)
  let base = process.env.AUTH_URL || ''
  if (!base) {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host') || ''
    const proto = h.get('x-forwarded-proto') || 'https'
    if (host) base = `${proto}://${host}`
  }
  base = base.replace(/\/$/, '')
  const endpoint = `${base}/api/dev/fat`
  const reportUrl = `${base}/fat-report/${reportToken('fat')}`
  const reportQr = await QRCode.toDataURL(reportUrl, { margin: 1, width: 220 }).catch(() => '')

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_14%,#fff)] grid place-items-center text-[22px]">⚖️</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1C1917]">ทดสอบรับค่าเครื่องวัดไขมัน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">เดชบอร์ดทดสอบ — รอรับค่าจากเครื่องวัดไขมัน/องค์ประกอบร่างกายผ่าน API gateway แบบเรียลไทม์</p>
        </div>
        <Link href="/dev" className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold whitespace-nowrap">← กลับหน้าพัฒนา</Link>
      </div>
      <FatTestDashboard endpoint={endpoint} reportUrl={reportUrl} reportQr={reportQr} />
    </div>
  )
}
