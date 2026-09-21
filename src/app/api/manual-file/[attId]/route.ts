import { serveManualFile } from '@/lib/manualServer'

export const dynamic = 'force-dynamic'

// เสิร์ฟไฟล์คู่มือแบบสาธารณะ (เปิดจากหน้า /manual/<token>) — ?dl=1 เพื่อดาวน์โหลด
export async function GET(req: Request, { params }: { params: Promise<{ attId: string }> }) {
  const { attId } = await params
  const dl = new URL(req.url).searchParams.get('dl') === '1'
  return serveManualFile(attId, dl)
}
