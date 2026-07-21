import Link from 'next/link'

// Job-detail workflow tabs (decoupled from the dashboard's coarse phase tracker).
const DETAIL_STEPS: { label: string; href: string }[] = [
  { label: 'ข้อมูลงาน', href: '' },
  { label: 'ลง Serial', href: '/serial' },
  { label: 'QC', href: '/qc' },
  { label: 'งานจัดส่ง', href: '/delivery' },
  { label: 'ติดตั้ง & ส่งมอบ', href: '/handover' },
  { label: 'งานบิล', href: '/invoice' },
]

export type StepNo = 1 | 2 | 3 | 4 | 5 | 6

// Vertical sidebar on desktop, horizontal scroll strip on mobile.
export function JobStepNav({ jobId, active }: { jobId: string; active: StepNo }) {
  return (
    <nav
      aria-label="ขั้นตอนงาน"
      className="flex md:flex-col gap-1.5 md:gap-1.5 overflow-x-auto md:overflow-visible md:w-56 md:shrink-0 md:sticky md:top-[84px] px-4 md:px-0 pt-4 md:pt-6 pb-1"
    >
      {DETAIL_STEPS.map((step, i) => {
        const n = (i + 1) as StepNo
        const isActive = n === active
        return (
          <Link
            key={step.label}
            href={`/jobs/${jobId}${step.href}`}
            prefetch={false}
            aria-current={isActive ? 'step' : undefined}
            className={`shrink-0 md:shrink flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-[#EA580C] text-white shadow-[0_6px_16px_-8px_rgba(234,88,12,0.6)]' : 'text-[#57534E] hover:bg-[#F0EEEC]'
            }`}
          >
            <span
              className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-[12px] font-bold ${
                isActive ? 'bg-white/25 text-white' : 'bg-[#ECEAE8] text-[#A8A29E]'
              }`}
            >
              {n}
            </span>
            <span>{step.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
