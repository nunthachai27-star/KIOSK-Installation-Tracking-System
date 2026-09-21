import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { listManuals } from '@/lib/manualServer'
import { ManualManager } from '@/components/ManualManager'

export const dynamic = 'force-dynamic'

export default async function ManualsPage() {
  let base = process.env.AUTH_URL || ''
  if (!base) {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host') || ''
    const proto = h.get('x-forwarded-proto') || 'https'
    if (host) base = `${proto}://${host}`
  }
  base = base.replace(/\/$/, '')

  const manuals = await listManuals()
  const withQr = await Promise.all(manuals.map(async (m) => {
    const url = `${base}/manual/${m.token}`
    return { ...m, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 200 }).catch(() => '') }
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_14%,#fff)] grid place-items-center text-[22px]">📚</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">คู่มือ</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">เก็บคู่มือการใช้งาน · แต่ละคู่มือมีลิงก์ + QR ให้เปิดดูสาธารณะได้ (ไม่ต้องล็อกอิน)</p>
        </div>
      </div>
      <ManualManager initial={withQr} />
    </div>
  )
}
