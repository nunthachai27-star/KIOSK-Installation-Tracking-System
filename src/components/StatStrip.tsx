export function StatStrip({ items }: { items: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {items.map((s) => (
        <div key={s.label} className="bg-white border border-[#DEDDEC] rounded-2xl px-4 py-4">
          <div className="text-[13px] text-[#6E7191] font-medium">{s.label}</div>
          <div className="text-4xl font-bold mt-1 tracking-tight" style={{ color: s.warn ? '#C13540' : '#2E3252' }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
