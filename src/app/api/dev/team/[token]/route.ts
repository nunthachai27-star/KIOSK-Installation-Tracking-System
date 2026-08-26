import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidDevToken, teamNoteFor, serializeWithImages, REQUEST_INCLUDE } from '@/lib/devRequestServer'

export const dynamic = 'force-dynamic'

// ── GET (สาธารณะผ่าน token): บอร์ดคำขอทั้งหมดสำหรับทีมพัฒนา ────────────────────
// ตรวจ token เอง (middleware เปิดทางแค่ path นี้). token ผิด = 404 (ไม่บอกว่ามีจริงไหม).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!(await isValidDevToken(token))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const [rows, teamNote] = await Promise.all([
    prisma.devRequest.findMany({ orderBy: { createdAt: 'desc' }, include: REQUEST_INCLUDE }),
    teamNoteFor(token),
  ])
  return NextResponse.json(
    { requests: await serializeWithImages(rows), teamNote },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
