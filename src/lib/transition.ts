import type { JobStatus } from '@prisma/client'
import { STATUS_META } from './status'

export function isValidStatus(s: string): s is JobStatus {
  return s in STATUS_META
}
