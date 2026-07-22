import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { AUDIT_ACTION_LABEL, type AuditAction } from '@/lib/audit'

const PER = 50
const dtFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const action = sp.action && ['CREATE', 'UPDATE', 'DELETE'].includes(sp.action) ? (sp.action as AuditAction) : undefined
  const where = action ? { action } : {}

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER }),
    prisma.auditLog.count({ where }),
  ])
  const pageCount = Math.max(1, Math.ceil(total / PER))
  const q = (p: number, a?: string) => `/logs?page=${p}${a ? `&action=${a}` : ''}`

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#EEF3FA] grid place-items-center text-[20px]">🧾</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Log การใช้งาน</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">บันทึกการกระทำหลัก (เพิ่ม/แก้/ลบ) ว่าใครทำอะไร · ทั้งหมด {total.toLocaleString('th-TH')} รายการ</p>
        </div>
      </div>

      {/* action filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={q(1)} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${!action ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>ทั้งหมด</Link>
        {(['CREATE', 'UPDATE', 'DELETE'] as const).map((a) => (
          <Link key={a} href={q(1, a)} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${action === a ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-[#5A6B82] border-[#E1E8F2] hover:bg-[#F6F9FC]'}`}>
            {AUDIT_ACTION_LABEL[a].label}
          </Link>
        ))}
      </div>

      <div className="ds-card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[640px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
              <th className="px-4 py-2.5 font-semibold">เวลา</th>
              <th className="px-4 py-2.5 font-semibold">ผู้ทำ</th>
              <th className="px-4 py-2.5 font-semibold">การกระทำ</th>
              <th className="px-4 py-2.5 font-semibold">หมวด</th>
              <th className="px-4 py-2.5 font-semibold">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8492A6]">ยังไม่มีบันทึก</td></tr>}
            {rows.map((r) => {
              const a = AUDIT_ACTION_LABEL[r.action as AuditAction] ?? { label: r.action, color: '#5A6B82', bg: '#EEF1F5' }
              return (
                <tr key={r.id} className="border-b border-[#F7F8FA] last:border-0 hover:bg-[#FBFAF8]">
                  <td className="px-4 py-2.5 text-[11.5px] text-[#5A6B82] whitespace-nowrap tnum">{dtFmt.format(r.createdAt)}</td>
                  <td className="px-4 py-2.5 text-[#1C1917] whitespace-nowrap">{r.userName ?? '—'}</td>
                  <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: a.bg, color: a.color }}>{a.label}</span></td>
                  <td className="px-4 py-2.5 text-[#5A6B82] whitespace-nowrap">{r.entity}</td>
                  <td className="px-4 py-2.5 text-[#3C4A5E]">{r.summary}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-[#8492A6]">หน้า {page.toLocaleString('th-TH')} / {pageCount.toLocaleString('th-TH')}</span>
          <div className="flex items-center gap-1">
            {page > 1 && <Link href={q(page - 1, action)} className="min-w-[32px] h-8 grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] border border-[#E1E8F2] hover:bg-[#F0EEEC]">‹</Link>}
            {page < pageCount && <Link href={q(page + 1, action)} className="min-w-[32px] h-8 grid place-items-center rounded-lg text-[13px] font-semibold text-[#5A6B82] border border-[#E1E8F2] hover:bg-[#F0EEEC]">›</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
