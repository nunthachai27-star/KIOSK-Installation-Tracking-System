import { serveProductImage } from '@/lib/kioskProductServer'

export const dynamic = 'force-dynamic'

// ── GET (สาธารณะ): เสิร์ฟรูปโปรดัก (เฉพาะรูปที่ผูกกับ KioskProduct) ─────────────
export async function GET(_req: Request, { params }: { params: Promise<{ attId: string }> }) {
  const { attId } = await params
  return serveProductImage(attId)
}
