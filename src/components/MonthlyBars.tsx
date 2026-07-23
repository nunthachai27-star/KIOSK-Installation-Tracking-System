// Pure CSS/SVG-free bar chart (no chart library) for the dashboard.
// Renders 12 month bars, colored green/red by change vs the previous month,
// with a delta % label on top. Read-only presentation component.
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const UP = '#157F4C'
const DOWN = '#C13540'
const FLAT = '#94A3B8'

function delta(cur: number, prev: number | null): { color: string; text: string } | null {
  if (prev == null) return null
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return { color: UP, text: '▲ ใหม่' }
  const p = Math.round(((cur - prev) / prev) * 100)
  if (p === 0) return { color: FLAT, text: '0%' }
  return p > 0 ? { color: UP, text: `▲ +${p}%` } : { color: DOWN, text: `▼ ${p}%` }
}

export function MonthlyBars({ values, format }: { values: number[]; format: (n: number) => string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 min-w-[560px] h-[240px] pt-7">
        {values.map((v, i) => {
          const prev = i === 0 ? null : values[i - 1]
          const d = delta(v, prev)
          const barColor = i === 0 || prev === null ? FLAT : v > prev ? UP : v < prev ? DOWN : FLAT
          const pct = v <= 0 ? 0 : Math.max(2, Math.round((v / max) * 100))
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              {/* delta label */}
              <div className="text-[10px] font-bold leading-none mb-1 h-3" style={{ color: d?.color ?? 'transparent' }}>
                {d?.text ?? '·'}
              </div>
              {/* value */}
              <div className="text-[10.5px] font-semibold text-[#3C4A5E] leading-none mb-1 tnum">{v > 0 ? format(v) : ''}</div>
              {/* bar */}
              <div className="w-full rounded-t-md transition-all" style={{ height: `${pct}%`, minHeight: v > 0 ? 4 : 0, background: barColor }} />
              {/* month */}
              <div className="text-[11px] text-[#8492A6] mt-1.5 leading-none">{TH_MONTHS[i]}</div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-[#8492A6]">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: UP }} /> เพิ่มจากเดือนก่อน</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: DOWN }} /> ลดลง</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: FLAT }} /> เท่าเดิม/เดือนแรก</span>
      </div>
    </div>
  )
}
