import { buildSteps } from '@/lib/steps'

const numBg = { done: '#157F4C', active: '#2F6BED', todo: '#EAEFF6' }
const numFg = { done: '#fff', active: '#fff', todo: '#A2AEC0' }

export function StepTracker({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-start gap-0">
      {buildSteps(active).map((f) => (
        <div key={f.n} className="flex-1 flex flex-col items-center gap-2">
          <span className="w-10 h-10 rounded-full grid place-items-center font-bold" style={{ background: numBg[f.state], color: numFg[f.state] }}>{f.n}</span>
          <span className="text-sm font-semibold" style={{ color: f.state === 'todo' ? '#A2AEC0' : '#12233B' }}>{f.label}</span>
        </div>
      ))}
    </div>
  )
}
