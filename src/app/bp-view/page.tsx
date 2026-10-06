import Link from 'next/link'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { BpTestDashboard } from '@/components/BpTestDashboard'
import { BpViewLogin, BpViewLogout } from '@/components/BpViewLogin'
import { reportToken } from '@/lib/reportToken'
import { isBpViewer } from '@/lib/bpViewAuth'

export const dynamic = 'force-dynamic'

export default async function BpViewPage() {
  if (!(await isBpViewer())) return <BpViewLogin />

  let base = process.env.AUTH_URL || ''
  if (!base) {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host') || ''
    const proto = h.get('x-forwarded-proto') || 'https'
    if (host) base = `${proto}://${host}`
  }
  base = base.replace(/\/$/, '')
  const endpoint = `${base}/api/dev/bp`
  const reportUrl = `${base}/bp-report/${reportToken('bp')}`
  const reportQr = await QRCode.toDataURL(reportUrl, { margin: 1, width: 220 }).catch(() => '')
  const summaryUrl = `${base}/bp-summary/${reportToken('bpsum')}`
  const summaryQr = await QRCode.toDataURL(summaryUrl, { margin: 1, width: 220 }).catch(() => '')

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_14%,#fff)] grid place-items-center text-[22px]">🩺</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1C1917]">ทดสอบรับค่าเครื่องวัดความดัน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">โหมดดูอย่างเดียว · แสดงผล SYS / DIA / ชีพจร แบบเรียลไทม์</p>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Link href="/bp-view/report" className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">📄 รายงาน/เทียบเครื่อง</Link>
          <BpViewLogout />
        </div>
      </div>
      <div className="text-[12px] text-[#8492A6] bg-[#F8FAFD] border border-[#EEF2F8] rounded-lg px-3 py-2">👁️ โหมดดูอย่างเดียว — ไม่สามารถลบหรือแก้ไขข้อมูลได้</div>
      <BpTestDashboard endpoint={endpoint} reportUrl={reportUrl} reportQr={reportQr} summaryUrl={summaryUrl} summaryQr={summaryQr} canDelete={false} />
    </div>
  )
}
