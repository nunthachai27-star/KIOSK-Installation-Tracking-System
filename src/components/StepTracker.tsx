import { buildSteps } from '@/lib/steps'

const numBg = { done: '#157F4C', active: '#4C4FE6', todo: '#E4E4EF' }
const numFg = { done: '#fff', active: '#fff', todo: '#A6A7C2' }

export function StepTracker({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-start gap-0">
      {buildSteps(active).map((f) => (
        <div key={f.n} className="flex-1 flex flex-col items-center gap-2">
          <span className="w-10 h-10 rounded-full grid place-items-center font-bold" style={{ background: numBg[f.state], color: numFg[f.state] }}>{f.n}</span>
          <span className="text-sm font-semibold" style={{ color: f.state === 'todo' ? '#A6A7C2' : '#2E3252' }}>{f.label}</span>
        </div>
      ))}
    </div>
  )
}
