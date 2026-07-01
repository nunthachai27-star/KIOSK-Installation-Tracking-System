import Link from 'next/link'
import { STEP_LABELS } from '@/lib/steps'

const STEP_HREFS = ['', '/qc', '/delivery', '/handover'] as const

export function JobStepNav({ jobId, active }: { jobId: string; active: 1 | 2 | 3 | 4 }) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="ขั้นตอนงาน">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4
        const isActive = n === active
        return (
          <Link
            key={label}
            href={`/jobs/${jobId}${STEP_HREFS[i]}`}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={
              isActive
                ? { background: '#E6E6FB', color: '#4C4FE6' }
                : { color: '#6E7191' }
            }
            aria-current={isActive ? 'step' : undefined}
          >
            {n}. {label}
          </Link>
        )
      })}
    </nav>
  )
}
