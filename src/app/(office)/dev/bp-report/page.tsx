import { BpPersonReport } from '@/components/BpPersonReport'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// รายงานความดันรายบุคคล (เจ้าหน้าที่) — เปรียบเทียบผลระหว่างเครื่องของคนเดียวกัน + ปริ้น/PNG/PDF
export default async function BpReportOfficePage() {
  const canDelete = await isSuperAdmin()
  return <BpPersonReport canDelete={canDelete} />
}
