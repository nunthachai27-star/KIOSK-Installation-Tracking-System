import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const base = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base

// ถังขยะงาน: กรอง "งานที่ถูกลบลงถังขยะ" (deletedAt != null) ออกจากทุก query อัตโนมัติ
// ที่เดียวจบ — ยกเว้นเมื่อผู้เรียกระบุ deletedAt เอง (หน้าถังขยะ) จะไม่ถูกแทนที่
// หมายเหตุ: findUnique (ตาม id ตรงๆ) ไม่ถูกกรอง และ query ภายใน $transaction(tx) ก็ไม่ถูกกรอง
const FILTERED = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'])
// cast กลับเป็นชนิด PrismaClient เดิม เพื่อให้ทุก call site เดิม type ตรง (extension ยังทำงานตอน runtime)
export const prisma = base.$extends({
  query: {
    job: {
      $allOperations({ operation, args, query }) {
        if (FILTERED.has(operation)) {
          const a = (args ?? {}) as { where?: Record<string, unknown> }
          a.where = a.where ?? {}
          if (!('deletedAt' in a.where)) a.where.deletedAt = null
          return query(a as typeof args)
        }
        return query(args)
      },
    },
  },
}) as unknown as typeof base
