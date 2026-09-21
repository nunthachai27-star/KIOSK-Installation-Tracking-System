import { notFound } from 'next/navigation'
import { BpReportPublic } from '@/components/BpReportPublic'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

// หน้ารายงานเครื่องวัดความดันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login · อ่านอย่างเดียว)
// ต้องมี token ที่ถูกต้อง (เดา URL ตรงๆ ไม่ได้) — สร้างลิงก์จากหน้าเดชบอร์ด
export default async function BpReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== reportToken('bp')) notFound()
  return <BpReportPublic />
}
