import { prisma } from './prisma'

export function normalizeSerial(s: string): string {
  return s.trim().toUpperCase()
}

export async function findDuplicateSerial(serialNo: string, excludeJobId?: string): Promise<boolean> {
  const norm = normalizeSerial(serialNo)
  const existing = await prisma.serialNumber.findFirst({
    where: { serialNo: norm, ...(excludeJobId ? { NOT: { jobId: excludeJobId } } : {}) },
  })
  return !!existing
}
