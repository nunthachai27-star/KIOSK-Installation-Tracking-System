const nf = new Intl.NumberFormat('th-TH')

export function formatBaht(n: number | string): string {
  const value = typeof n === 'string' ? Number(n) : n
  return nf.format(value)
}

export function formatQty(n: number): string {
  return nf.format(n)
}

// Thai Buddhist-year short date, e.g. "22 มิ.ย. 2569". Returns "—" when empty.
const thaiDate = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
export function formatThaiDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return thaiDate.format(date)
}
