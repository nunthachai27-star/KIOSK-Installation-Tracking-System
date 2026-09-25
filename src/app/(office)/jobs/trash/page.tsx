import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/superAdmin'
import { JobTrashActions } from '@/components/JobTrashActions'

export const dynamic = 'force-dynamic'

const dtFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default async function JobTrashPage() {
  // เฉพาะ super admin เท่านั้น
  if (!(await isSuperAdmin())) notFound()

  // ระบุ deletedAt เอง → ตัวกรองรวมศูนย์จะไม่แทนที่ (เห็นเฉพาะงานในถังขยะ)
  const jobs = await prisma.job.findMany({
    where: { deletedAt: { not: null } },
    include: { hospital: { select: { name: true } } },
    orderBy: { deletedAt: 'desc' },
  })

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#FBE4E4] grid place-items-center text-[20px]">🗑️</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1C1917]">ถังขยะงาน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">งานที่ถูกย้ายลงถังขยะ (ซ่อนจากทุกหน้า) · กู้คืนกลับมาใช้ หรือลบถาวรได้ · ทั้งหมด {jobs.length} งาน</p>
        </div>
        <Link href="/" className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold whitespace-nowrap">← กลับหน้าหลัก</Link>
      </div>

      <div className="ds-card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[680px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-4 py-2.5 font-semibold">รหัสงาน</th>
              <th className="px-4 py-2.5 font-semibold">โรงพยาบาล</th>
              <th className="px-4 py-2.5 font-semibold">ประเภท</th>
              <th className="px-4 py-2.5 font-semibold">ลบเมื่อ</th>
              <th className="px-4 py-2.5 font-semibold">ลบโดย</th>
              <th className="px-4 py-2.5 font-semibold text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8492A6]">ถังขยะว่าง — ไม่มีงานที่ถูกลบ</td></tr>}
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
                <td className="px-4 py-2.5 font-semibold text-[#1C1917] whitespace-nowrap">{j.jobCode}</td>
                <td className="px-4 py-2.5 text-[#3C4A5E]">{j.hospital?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-[#5A6B82] whitespace-nowrap">{j.productType}</td>
                <td className="px-4 py-2.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap tnum">{j.deletedAt ? dtFmt.format(j.deletedAt) : '—'}</td>
                <td className="px-4 py-2.5 text-[#5A6B82] whitespace-nowrap">{j.deletedBy ?? '—'}</td>
                <td className="px-4 py-2.5"><JobTrashActions jobId={j.id} jobCode={j.jobCode} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-[#A8A29E]">* “ลบถาวร” จะลบงานและข้อมูลลูกทั้งหมด (serial/QC/ส่งของ/ติดตั้ง/ส่งมอบ/บิล/เคลม) อย่างถาวร ย้อนกลับไม่ได้</p>
    </div>
  )
}
