import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isValidDevToken, teamNoteFor, serializeWithImages, REQUEST_INCLUDE } from '@/lib/devRequestServer'
import { DevBoard } from '@/components/DevBoard'

export const dynamic = 'force-dynamic'

// หน้าสาธารณะสำหรับทีมพัฒนา — เข้าผ่านลิงก์ token ลับ (ไม่ต้องมี user เว็บหลัก).
// ตรวจ token ก่อนเสมอ; ผิด = 404. แก้ได้แค่สถานะ + คอมเมนต์ (บังคับที่ API อีกชั้น).
export default async function DevTeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!(await isValidDevToken(token))) notFound()

  const [rows, teamNote] = await Promise.all([
    prisma.devRequest.findMany({ orderBy: { createdAt: 'desc' }, include: REQUEST_INCLUDE }),
    teamNoteFor(token),
  ])
  const initial = await serializeWithImages(rows)

  return (
    <div style={{ minHeight: '100vh', background: '#F1F4F8' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #E7EDF4', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(140deg,#7A44C6,#9B6BE0)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>K</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1B2430' }}>KIOSK · บอร์ดคำขอพัฒนา</div>
            <div style={{ fontSize: 11.5, color: '#74839A' }}>มุมมองทีมพัฒนา · แก้ได้แค่สถานะ & คอมเมนต์</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#7A44C6', background: '#F0E8FB', border: '1px solid #E0CFF6', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>🔗 ลิงก์ทีมพัฒนา</span>
        </div>
      </header>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#F0E8FB', border: '1px solid #E0CFF6', color: '#7A44C6', fontSize: 12.5, flexWrap: 'wrap' }}>
            <b>👋 สวัสดีทีมพัฒนา</b>
            <span style={{ opacity: .85 }}>อัปเดตสถานะและคอมเมนต์ในแต่ละคำขอได้เลย — ทีมเทคนิคจะเห็นความคืบหน้าทันที</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <DevBoard initial={initial} mode="dev" token={token} teamNote={teamNote} />
        </div>
      </div>
    </div>
  )
}
