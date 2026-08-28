import { NextResponse } from 'next/server'
import { listProducts } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

// ── GET (สาธารณะ): รายการโปรดักสำหรับโชว์เคส ─────────────────────────────────
export async function GET() {
  const products = await listProducts()
  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
}
