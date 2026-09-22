import { notFound } from 'next/navigation'
import { BpPublicReport } from '@/components/BpPublicReport'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

// หน้ารายงานความดันแบบสาธารณะ (เปิดจากลิงก์/QR — ไม่ต้อง login)
// ต้องมี token ที่ถูกต้อง แล้วกรอกชื่อผู้วัด → เทียบเครื่อง + ประวัติรายรอบ + โหลด PNG/PDF
export default async function BpReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== reportToken('bp')) notFound()
  return <BpPublicReport />
}
