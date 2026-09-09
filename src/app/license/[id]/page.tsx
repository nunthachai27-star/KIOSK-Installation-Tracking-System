import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { BMS_LOGO_DATA_URL } from '@/lib/bmsLogo'
import { LicensePrintButton } from '@/components/LicensePrintButton'
import { LicenseQr } from '@/components/LicenseQr'

export const dynamic = 'force-dynamic'

// หน้าสาธารณะ (อ่านอย่างเดียว) สำหรับส่งข้อมูล License/MAC ต่อเครื่องให้โรงพยาบาล
// เปิดจากลิงก์ที่คัดลอกในหน้า QC — ไม่มีปุ่มแก้ไขใดๆ · มี QR ของ License ไว้สแกน
export default async function LicensePublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      jobCode: true, contractNo: true, province: true,
      hospital: { select: { name: true, code: true } },
      serials: {
        orderBy: { serialNo: 'asc' },
        select: { serialNo: true, serialType: true, unitQc: { select: { keyId: true, licenseKey: true, memoLicense: true } } },
      },
    },
  })
  if (!job) notFound()

  const bms = job.serials.filter((s) => s.serialType === 'BMS')
  const units = await Promise.all(
    bms.map(async (s) => {
      const licenseKey = s.unitQc?.licenseKey?.trim() || ''
      const qr = licenseKey ? await QRCode.toDataURL(licenseKey, { margin: 1, width: 220, errorCorrectionLevel: 'M' }) : ''
      return { serialNo: s.serialNo, keyId: s.unitQc?.keyId?.trim() || '', licenseKey, memoLicense: s.unitQc?.memoLicense ?? false, qr }
    }),
  )

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-[820px] mx-auto">
        {/* หัวเอกสาร */}
        <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-6 mb-5 print:shadow-none print:border-0">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BMS_LOGO_DATA_URL} alt="BMS" width={52} height={52} className="rounded-md" />
            <div className="flex-1 min-w-0">
              <h1 className="text-[19px] font-bold text-[#1C2A3E] leading-tight">ข้อมูล License &amp; MAC Address</h1>
              <div className="text-[13.5px] text-[#5A6B82] mt-1">
                🏥 <span className="font-semibold text-[#1C1917]">{job.hospital.name}</span>
                {job.hospital.code ? <> · รหัสสถานพยาบาล <span className="tnum">{job.hospital.code}</span></> : null}
              </div>
              <div className="text-[12.5px] text-[#8492A6] mt-0.5">
                งาน {job.jobCode}{job.contractNo ? ` · ${job.contractNo}` : ''}{job.province ? ` · ${job.province}` : ''} · {units.length} เครื่อง
              </div>
            </div>
            <div className="print:hidden"><LicensePrintButton /></div>
          </div>
          <div className="mt-4 text-[12px] text-[#8492A6] bg-[#F6F9FC] border border-[#E7EDF4] rounded-lg px-3 py-2">
            🔒 เอกสารนี้แสดงผลอย่างเดียว (แก้ไขไม่ได้) — ข้อมูล License เป็นความลับเฉพาะโรงพยาบาล
          </div>
        </div>

        {/* รายเครื่อง */}
        <div className="flex flex-col gap-4">
          {units.map((u, i) => (
            <div key={u.serialNo || i} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-5 print:shadow-none print:break-inside-avoid">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-[#E7F4EE] text-[#157F4C] grid place-items-center font-bold text-sm">{i + 1}</span>
                <span className="text-[16px] font-bold text-[#1C1917] tnum">{u.serialNo || '—'}</span>
                {u.memoLicense && <span className="text-[11px] font-semibold text-[#157F4C] bg-[#E7F4EE] rounded-full px-2 py-0.5">ขอเปิด MEMO License แล้ว</span>}
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <Field label="Key ID / MAC Address" value={u.keyId} />
                  <Field label="License Key" value={u.licenseKey} mono />
                </div>
                <div className="shrink-0 text-center">
                  <LicenseQr qr={u.qr} serialNo={u.serialNo} licenseKey={u.licenseKey} />
                </div>
              </div>
            </div>
          ))}
          {units.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E3EAF2] p-8 text-center text-[#8492A6]">ยังไม่มีเครื่องในงานนี้</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-[#8492A6] mb-1">{label}</div>
      <div className={`select-all break-all text-[15px] text-[#1C1917] bg-[#F6F9FC] border border-[#E7EDF4] rounded-lg px-3 py-2 ${mono ? 'font-mono tracking-wide' : ''}`}>
        {value || <span className="text-[#B4BCC8]">—</span>}
      </div>
    </div>
  )
}
