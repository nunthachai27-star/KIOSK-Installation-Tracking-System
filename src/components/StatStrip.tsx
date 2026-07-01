export function StatStrip({ items }: { items: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {items.map((s) => (
        <div key={s.label} className="bg-white border border-[#E7EDF4] rounded-2xl px-4 py-4">
          <div className="text-[13px] text-[#5A6B82] font-medium">{s.label}</div>
          <div className="text-4xl font-bold mt-1 tracking-tight" style={{ color: s.warn ? '#C13540' : '#12233B' }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
