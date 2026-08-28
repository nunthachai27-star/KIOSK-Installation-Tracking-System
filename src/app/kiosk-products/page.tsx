import { auth } from '@/lib/auth'
import { listProducts } from '@/lib/kioskProductServer'
import { KioskProductShowcase } from '@/components/KioskProductShowcase'

export const dynamic = 'force-dynamic'

// หน้าโชว์เคสโปรดัก Kiosk — เปิดสาธารณะ (ส่งลิงก์ให้ลูกค้าได้). ตรวจ session เพื่อโชว์ปุ่มแอดมิน.
export default async function KioskProductsPage() {
  const [products, session] = await Promise.all([listProducts(), auth()])
  const admin = session?.user?.role === 'OFFICE'
  return <KioskProductShowcase products={products} admin={admin} />
}
