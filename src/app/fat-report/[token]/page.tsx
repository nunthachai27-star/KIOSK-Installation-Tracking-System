import { notFound } from 'next/navigation'
import { FatPublicReport } from '@/components/FatPublicReport'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

// หน้ารายงานเครื่องวัดไขมันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login)
// ต้องมี token ที่ถูกต้อง แล้วกรอกชื่อผู้วัดเพื่อดูเฉพาะผลของคนนั้น + โหลด PNG/PDF ได้
export default async function FatReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== reportToken('fat')) notFound()
  return <FatPublicReport />
}
