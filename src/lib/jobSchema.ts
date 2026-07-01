import { z } from 'zod'

export const jobInput = z.object({
  jobCode: z.string().min(1),
  hospitalId: z.string().min(1),
  province: z.string().min(1),
  productType: z.string().min(1),
  productModel: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  salesAmount: z.coerce.number().min(0).default(0),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contractNo: z.string().optional().nullable(),
  contractStartDate: z.coerce.date().optional().nullable(),
  contractEndDate: z.coerce.date().optional().nullable(),
  deliveryDueDate: z.coerce.date().optional().nullable(),
  adminOwnerId: z.string().optional().nullable(),
  installerOwnerId: z.string().optional().nullable(),
})
export type JobInput = z.infer<typeof jobInput>
