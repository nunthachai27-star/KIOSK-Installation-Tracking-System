const nf = new Intl.NumberFormat('th-TH')

export function formatBaht(n: number | string): string {
  const value = typeof n === 'string' ? Number(n) : n
  return nf.format(value)
}

export function formatQty(n: number): string {
  return nf.format(n)
}
