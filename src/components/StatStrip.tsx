export function StatStrip({ items }: { items: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s) => (
        <div key={s.label} className="ds-card ds-hover ds-lift px-5 py-4 relative overflow-hidden">
          {s.warn && <span className="absolute inset-x-0 top-0 h-[3px] bg-[#C13540]/70" />}
          <div className="text-[12px] font-semibold tracking-wide text-[#8492A6]">{s.label}</div>
          <div
            className="text-[32px] leading-none font-bold mt-2 tracking-tight tnum"
            style={{ color: s.warn ? '#C13540' : '#1C1917' }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}
