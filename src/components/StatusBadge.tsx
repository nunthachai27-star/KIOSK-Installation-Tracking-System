import type { JobStatus } from '@prisma/client'
import { STATUS_META } from '@/lib/status'

export function StatusBadge({ status }: { status: JobStatus }) {
  const m = STATUS_META[status]
  return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: m.bg, color: m.color }}>{m.label}</span>
}
