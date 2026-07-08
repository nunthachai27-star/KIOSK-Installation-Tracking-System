// Warranty on installed equipment runs 1 year from the invoice open date.
export function warrantyEndFrom(invoiceDate: Date): Date {
  const d = new Date(invoiceDate)
  d.setFullYear(d.getFullYear() + 1)
  return d
}
