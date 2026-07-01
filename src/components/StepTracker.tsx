import { buildSteps } from '@/lib/steps'

const circle = {
  done: { bg: '#157F4C', fg: '#fff' },
  active: { bg: '#2F6BED', fg: '#fff' },
  todo: { bg: '#EAEFF6', fg: '#A2AEC0' },
} as const

const sub = {
  done: { label: 'เสร็จ', bg: '#E2F3EA', fg: '#157F4C' },
  active: { label: 'กำลังทำ', bg: '#E4EEFF', fg: '#2F6BED' },
  todo: { label: 'รอ', bg: '#EEF1F5', fg: '#8492A6' },
} as const

export function StepTracker({ active }: { active: 1 | 2 | 3 | 4 }) {
  const steps = buildSteps(active)
  return (
    <div className="relative">
      {/* connecting line behind the circles */}
      <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-[#E1E9F3]" />
      <div className="relative flex">
        {steps.map((f) => (
          <div key={f.n} className="flex-1 flex flex-col items-center gap-2">
            <span
              className="w-10 h-10 rounded-full grid place-items-center font-bold text-base"
              style={{ background: circle[f.state].bg, color: circle[f.state].fg }}
            >
              {f.n}
            </span>
            <span className="text-sm font-semibold" style={{ color: f.state === 'todo' ? '#A2AEC0' : '#12233B' }}>
              {f.label}
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: sub[f.state].bg, color: sub[f.state].fg }}
            >
              {sub[f.state].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
