import { notFound } from 'next/navigation'
import { FatReportPublic } from '@/components/FatReportPublic'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

// หน้ารายงานเครื่องวัดไขมันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login · อ่านอย่างเดียว)
// ต้องมี token ที่ถูกต้อง (เดา URL ตรงๆ ไม่ได้) — สร้างลิงก์จากหน้าเดชบอร์ด
export default async function FatReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== reportToken('fat')) notFound()
  return <FatReportPublic />
}
