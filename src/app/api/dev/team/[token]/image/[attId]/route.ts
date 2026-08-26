import { NextResponse } from 'next/server'
import { isValidDevToken, serveDevImage } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── GET (สาธารณะผ่าน token): เสิร์ฟรูปให้ทีมพัฒนา (เฉพาะรูปที่ผูกกับ DevRequest) ──
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; attId: string }> }) {
  const { token, attId } = await params
  if (!(await isValidDevToken(token))) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return serveDevImage(attId)
}
