import { prisma } from './prisma'

export type CalKind = 'shipped' | 'arrived' | 'remote' | 'due'

export type CalEvent = {
  date: Date
  jobId: string
  jobCode: string
  hospital: string
  province: string
  kind: CalKind
}

export const KIND_META: Record<CalKind, { label: string; color: string; bg: string }> = {
  shipped: { label: 'ขนของออก', color: '#1B5FD9', bg: '#E4EEFF' },
  arrived: { label: 'ส่งถึง รพ.', color: '#0B7C86', bg: '#DCF1F2' },
  remote: { label: 'Remote/ติดตั้ง', color: '#9A6B10', bg: '#FAF0D8' },
  due: { label: 'ครบกำหนดส่งมอบ', color: '#C13540', bg: '#FBE4E4' },
}

const jobInc = { job: { include: { hospital: true } } } as const
function ev(job: { id: string; jobCode: string; province: string; hospital: { name: string } }, date: Date, kind: CalKind): CalEvent {
  return { date, jobId: job.id, jobCode: job.jobCode, hospital: job.hospital.name, province: job.province, kind }
}

// Gather work events (from delivery / installation / due dates) within [from, to].
export async function getCalendarEvents(from: Date, to: Date): Promise<CalEvent[]> {
  const events: CalEvent[] = []

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { OR: [{ shippedDate: { gte: from, lte: to } }, { arrivedDate: { gte: from, lte: to } }] },
    include: jobInc,
  })
  for (const d of deliveries) {
    if (d.shippedDate && d.shippedDate >= from && d.shippedDate <= to) events.push(ev(d.job, d.shippedDate, 'shipped'))
    if (d.arrivedDate && d.arrivedDate >= from && d.arrivedDate <= to) events.push(ev(d.job, d.arrivedDate, 'arrived'))
  }

  const installs = await prisma.installationRecord.findMany({
    where: { remoteDate: { gte: from, lte: to } },
    include: jobInc,
  })
  for (const i of installs) if (i.remoteDate) events.push(ev(i.job, i.remoteDate, 'remote'))

  const due = await prisma.job.findMany({
    where: { deliveryDueDate: { gte: from, lte: to } },
    include: { hospital: true },
  })
  for (const j of due) if (j.deliveryDueDate) events.push(ev(j, j.deliveryDueDate, 'due'))

  return events
}

// The most recent event date that isn't in the future (used to open the
// calendar on a populated month by default). Capping at "now" avoids opening on
// mis-parsed far-future dates from the source data.
export async function latestEventDate(): Promise<Date | null> {
  const now = new Date()
  const [a, s, r, d] = await Promise.all([
    prisma.deliveryRecord.findFirst({ where: { arrivedDate: { lte: now } }, orderBy: { arrivedDate: 'desc' }, select: { arrivedDate: true } }),
    prisma.deliveryRecord.findFirst({ where: { shippedDate: { lte: now } }, orderBy: { shippedDate: 'desc' }, select: { shippedDate: true } }),
    prisma.installationRecord.findFirst({ where: { remoteDate: { lte: now } }, orderBy: { remoteDate: 'desc' }, select: { remoteDate: true } }),
    prisma.job.findFirst({ where: { deliveryDueDate: { lte: now } }, orderBy: { deliveryDueDate: 'desc' }, select: { deliveryDueDate: true } }),
  ])
  const dates = [a?.arrivedDate, s?.shippedDate, r?.remoteDate, d?.deliveryDueDate].filter((x): x is Date => x != null)
  if (!dates.length) return null
  return dates.reduce((x, y) => (x > y ? x : y))
}

// Build a 6x7 month grid (Sunday-first) of UTC dates.
export function monthGrid(year: number, month0: number): { days: Date[]; from: Date; to: Date } {
  const first = new Date(Date.UTC(year, month0, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay()) // back to Sunday
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    days.push(d)
  }
  const from = new Date(Date.UTC(year, month0, 1, 0, 0, 0))
  const to = new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59))
  return { days, from, to }
}

export function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
