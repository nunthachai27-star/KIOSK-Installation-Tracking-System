import { FatPersonReport } from '@/components/FatPersonReport'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// รายงานรายคน (เจ้าหน้าที่) — สรุปผลล่าสุด + กราฟแนวโน้ม + ปริ้น A4 · จัดกลุ่มตามชื่อผู้วัด
export default async function FatReportOfficePage() {
  const canDelete = await isSuperAdmin()
  return <FatPersonReport canDelete={canDelete} />
}
