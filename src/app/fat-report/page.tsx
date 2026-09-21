import { FatReportPublic } from '@/components/FatReportPublic'

export const dynamic = 'force-dynamic'

// หน้ารายงานเครื่องวัดไขมันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login · อ่านอย่างเดียว)
export default function FatReportPage() {
  return <FatReportPublic />
}
