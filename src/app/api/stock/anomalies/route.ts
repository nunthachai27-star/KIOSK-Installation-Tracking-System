import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStockAnomalies } from '@/lib/stockAnomalies'

export const dynamic = 'force-dynamic'

// ตรวจสอบความผิดปกติในคลัง (อ่านอย่างเดียว) — เจ้าหน้าที่เท่านั้น
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const report = await getStockAnomalies()
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
}
