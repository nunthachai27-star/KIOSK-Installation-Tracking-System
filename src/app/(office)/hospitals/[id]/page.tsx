import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { JobRow } from '@/components/JobRow'
import { ISSUE_STATUS } from '@/lib/issue'
import { formatQty, formatThaiDate } from '@/lib/format'

const jobInclude = {
  hospital: true,
  delivery: { select: { shippedDate: true } },
  installation: { select: { remoteDate: true, result: true } },
  handover: { select: { checklistReceivedDate: true, handoverDate: true } },
  invoice: { select: { warrantyEndDate: true } },
} as const

export default async function HospitalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [hospital, bms, issues] = await Promise.all([
    prisma.hospital.findUnique({
      where: { id },
      include: { jobs: { include: jobInclude, orderBy: [{ isPlanned: 'asc' }, { updatedAt: 'desc' }] } },
    }),
    prisma.serialNumber.findMany({
      where: { serialType: 'BMS', job: { hospitalId: id } },
      include: { job: { select: { jobCode: true, productType: true } }, unitQc: { select: { status: true } } },
      orderBy: { serialNo: 'asc' },
    }),
    prisma.issue.findMany({
      where: { job: { hospitalId: id } },
      include: { serial: { select: { serialNo: true } }, reporter: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])
  if (!hospital) notFound()

  const itemCount = hospital.jobs.reduce((s, j) => s + j.quantity, 0)

  const stat = (value: number | string, label: string) => (
    <div className="ds-card p-4 flex-1 min-w-[130px]">
      <div className="text-[13px] text-[#8492A6]">{label}</div>
      <div className="text-2xl font-bold text-[#1C1917] mt-1 tnum">{value}</div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-[1000px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/hospitals" className="text-[#5A6B82] hover:text-[#EA580C]">‹ โรงพยาบาล</Link>
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">{hospital.name}</h1>
        <p className="text-[13px] text-[#8492A6] mt-0.5">{hospital.province}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {stat(formatQty(hospital.jobs.length), 'งานทั้งหมด')}
        {stat(formatQty(itemCount), 'สินค้ารวม')}
        {stat(formatQty(bms.length), 'เครื่อง (S/N BMS)')}
        {stat(formatQty(issues.filter((i) => i.status !== 'DONE').length), 'ปัญหาค้าง')}
      </div>

      {/* jobs */}
      <div className="ds-card overflow-hidden">
        <div className="px-5 pt-4 pb-2 text-[15px] font-bold">งานทั้งหมด · {formatQty(hospital.jobs.length)}</div>
        {hospital.jobs.length > 0
          ? hospital.jobs.map((j) => <JobRow key={j.id} job={j} />)
          : <div className="px-5 py-6 text-sm text-[#8492A6] border-t border-[#EEF2F8]">ไม่มีงาน</div>}
      </div>

      {/* BMS units */}
      {bms.length > 0 && (
        <div className="ds-card p-5">
          <div className="text-[15px] font-bold mb-3">เครื่อง (S/N BMS) · {formatQty(bms.length)}</div>
          <div className="flex flex-col gap-2">
            {bms.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] last:border-0 pb-2 last:pb-0">
                <div className="min-w-0">
                  <span className="tnum text-sm font-bold text-[#1C1917]">{s.serialNo}</span>
                  <span className="text-[12.5px] text-[#8492A6] ml-2">{s.job.productType} · {s.job.jobCode}</span>
                </div>
                {s.unitQc && (
                  <span className="text-[11.5px] font-semibold" style={{ color: s.unitQc.status === 'PASSED' ? '#157F4C' : s.unitQc.status === 'FAILED' ? '#C13540' : '#8492A6' }}>
                    QC: {s.unitQc.status === 'PASSED' ? 'ผ่าน' : s.unitQc.status === 'FAILED' ? 'ไม่ผ่าน' : 'รอตรวจ'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* issues */}
      {issues.length > 0 && (
        <div className="ds-card p-5">
          <div className="text-[15px] font-bold mb-3">ประวัติแจ้งปัญหา · {formatQty(issues.length)}</div>
          <div className="flex flex-col gap-3">
            {issues.map((i) => {
              const meta = ISSUE_STATUS[i.status]
              return (
                <div key={i.id} className="border-b border-[#F1F5F9] last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-semibold text-[#1C1917]">
                      {i.serial?.serialNo && <span className="tnum text-[#8492A6] mr-1.5">{i.serial.serialNo}</span>}
                      {i.title}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  {i.solution && <div className="text-[12.5px] text-[#5A6B82] mt-1">วิธีแก้: {i.solution}</div>}
                  <div className="text-[11px] text-[#A8A29E] mt-1">{i.reporter ? `${i.reporter.name} · ` : ''}{formatThaiDate(i.updatedAt)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
