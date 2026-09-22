import { notFound } from 'next/navigation'
import { BpExecSummary } from '@/components/BpExecSummary'
import { reportToken } from '@/lib/reportToken'

export const dynamic = 'force-dynamic'

// หน้าสรุปเปรียบเทียบเครื่องวัดความดัน (สำหรับผู้บริหาร) — สาธารณะผ่าน token, อ่านอย่างเดียว, ไม่มีข้อมูลส่วนบุคคล
export default async function BpSummaryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token !== reportToken('bpsum')) notFound()
  return <BpExecSummary />
}
