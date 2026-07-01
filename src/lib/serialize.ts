import type { Job, DeliveryRecord, InvoiceRecord } from '@prisma/client'

// Prisma's Decimal is a class instance and cannot be passed from a Server
// Component to a Client Component (Next.js rejects non-plain objects at the
// RSC boundary). These helpers convert the Decimal money fields to plain
// numbers before handing records to client form components.

export type SerializedJob = Omit<Job, 'salesAmount'> & { salesAmount: number }
export type SerializedDelivery = Omit<DeliveryRecord, 'estimatedCost' | 'actualCost'> & {
  estimatedCost: number | null
  actualCost: number | null
}
export type SerializedInvoice = Omit<InvoiceRecord, 'invoiceAmount'> & { invoiceAmount: number | null }

export function serializeJob<T extends Job>(job: T): Omit<T, 'salesAmount'> & { salesAmount: number } {
  return { ...job, salesAmount: job.salesAmount.toNumber() }
}

export function serializeDelivery(d: DeliveryRecord | null): SerializedDelivery | null {
  if (!d) return null
  return { ...d, estimatedCost: d.estimatedCost?.toNumber() ?? null, actualCost: d.actualCost?.toNumber() ?? null }
}

export function serializeInvoice(i: InvoiceRecord | null): SerializedInvoice | null {
  if (!i) return null
  return { ...i, invoiceAmount: i.invoiceAmount?.toNumber() ?? null }
}
