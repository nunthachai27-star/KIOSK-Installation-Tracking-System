import type { PrismaClient } from '@prisma/client'
import type { MasterCategory } from './master'

// Master values are denormalised as plain strings all over the schema — a job stores the
// product-type *text*, and the QC checklist / BOM / BMS code / serial slots are keyed by
// that same text. Renaming the option alone stranded every existing row under the old
// name: jobs kept showing the old value, and picking the new one on a job made its spec
// lookups miss, so components entered earlier looked like they had vanished.
// These carry a rename through to every copy so a rename stays a rename.

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

type Target = {
  label: string
  count: (db: Tx, value: string) => Promise<number>
  rename: (tx: Tx, from: string, to: string) => Promise<number>
  /** Unique per (productType, …) — renaming onto a name that already has rows collides. */
  unique?: boolean
}

const productTypeTarget = (
  label: string,
  count: (db: Tx, v: string) => Promise<number>,
  rename: (tx: Tx, from: string, to: string) => Promise<{ count: number }>,
  unique = false,
): Target => ({ label, count, rename: (tx, f, t) => rename(tx, f, t).then((r) => r.count), unique })

const TARGETS: Record<MasterCategory, Target[]> = {
  PRODUCT_TYPE: [
    productTypeTarget('งาน',
      (db, v) => db.job.count({ where: { productType: v } }),
      (tx, f, t) => tx.job.updateMany({ where: { productType: f }, data: { productType: t } })),
    productTypeTarget('เคลม/ปัญหา',
      (db, v) => db.issue.count({ where: { productType: v } }),
      (tx, f, t) => tx.issue.updateMany({ where: { productType: f }, data: { productType: t } })),
    productTypeTarget('รายการตรวจ QC',
      (db, v) => db.productChecklistItem.count({ where: { productType: v } }),
      (tx, f, t) => tx.productChecklistItem.updateMany({ where: { productType: f }, data: { productType: t } }), true),
    productTypeTarget('อุปกรณ์ในชุด',
      (db, v) => db.productComponent.count({ where: { productType: v } }),
      (tx, f, t) => tx.productComponent.updateMany({ where: { productType: f }, data: { productType: t } }), true),
    productTypeTarget('รหัส BMS',
      (db, v) => db.productBmsCode.count({ where: { productType: v } }),
      (tx, f, t) => tx.productBmsCode.updateMany({ where: { productType: f }, data: { productType: t } }), true),
    productTypeTarget('ช่องกรอก Serial',
      (db, v) => db.productSerialSlot.count({ where: { productType: v } }),
      (tx, f, t) => tx.productSerialSlot.updateMany({ where: { productType: f }, data: { productType: t } }), true),
  ],
  PROVINCE: [
    productTypeTarget('งาน',
      (db, v) => db.job.count({ where: { province: v } }),
      (tx, f, t) => tx.job.updateMany({ where: { province: f }, data: { province: t } })),
    productTypeTarget('โรงพยาบาล',
      (db, v) => db.hospital.count({ where: { province: v } }),
      (tx, f, t) => tx.hospital.updateMany({ where: { province: f }, data: { province: t } })),
  ],
  COLOR: [
    productTypeTarget('งาน',
      (db, v) => db.job.count({ where: { color: v } }),
      (tx, f, t) => tx.job.updateMany({ where: { color: f }, data: { color: t } })),
  ],
  EQUIPMENT_ITEM: [
    productTypeTarget('เคลม/ปัญหา',
      (db, v) => db.issue.count({ where: { equipment: v } }),
      (tx, f, t) => tx.issue.updateMany({ where: { equipment: f }, data: { equipment: t } })),
  ],
}

export type RenameCounts = Record<string, number>

/** How many rows carry `value` today — lets the UI say what a rename will touch. */
export async function previewRename(db: Tx, category: MasterCategory, value: string): Promise<RenameCounts> {
  const out: RenameCounts = {}
  for (const t of TARGETS[category]) out[t.label] = await t.count(db, value)
  return out
}

/**
 * Rows already filed under the new name in a uniquely-keyed table. Renaming onto them
 * would hit a constraint, so report it up front instead of failing mid-transaction.
 */
export async function findCollisions(db: Tx, category: MasterCategory, to: string): Promise<string[]> {
  const hits: string[] = []
  for (const t of TARGETS[category]) {
    if (t.unique && (await t.count(db, to)) > 0) hits.push(t.label)
  }
  return hits
}

/**
 * Rewrite every copy of `from` to `to`. Run inside the same transaction as the
 * MasterOption update so the option and its copies can never disagree.
 */
export async function applyRename(tx: Tx, category: MasterCategory, from: string, to: string): Promise<RenameCounts> {
  const out: RenameCounts = {}
  for (const t of TARGETS[category]) out[t.label] = await t.rename(tx, from, to)
  return out
}
