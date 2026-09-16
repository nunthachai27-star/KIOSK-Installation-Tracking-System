import { BpReportPublic } from '@/components/BpReportPublic'

export const dynamic = 'force-dynamic'

// หน้ารายงานเครื่องวัดความดันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login · อ่านอย่างเดียว)
export default function BpReportPage() {
  return <BpReportPublic />
}
