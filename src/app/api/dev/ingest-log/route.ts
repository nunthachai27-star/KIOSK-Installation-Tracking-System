import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listIngestLog } from '@/lib/ingestLog'

export const dynamic = 'force-dynamic'

// log การรับข้อมูลจากเครื่อง — เฉพาะเจ้าหน้าที่ (admin) เท่านั้น
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ logs: await listIngestLog(300) }, { headers: { 'Cache-Control': 'no-store' } })
}
