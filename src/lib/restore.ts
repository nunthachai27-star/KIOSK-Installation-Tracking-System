import { prisma } from './prisma'
import { logAction } from './audit'

// โมเดลที่รองรับการ "ย้อนคืน" (เฟส 1: ตารางเดี่ยว ไม่มี cascade ซับซ้อน)
const MODELS: Record<string, { delegate: string; label: string }> = {
  Note: { delegate: 'note', label: 'โน้ต' },
  ReportEntry: { delegate: 'reportEntry', label: 'สรุปงาน (พิมพ์เอง)' },
  Purchase: { delegate: 'purchase', label: 'งานจัดซื้อ' },
  Hospital: { delegate: 'hospital', label: 'โรงพยาบาล' },
  MasterOption: { delegate: 'masterOption', label: 'ตั้งค่า' },
  KioskProduct: { delegate: 'kioskProduct', label: 'โปรดัก Kiosk' },
  // เฟส 2
  Issue: { delegate: 'issue', label: 'แจ้งปัญหา/เคลม' },
  Loan: { delegate: 'loan', label: 'ยืม-คืน' },
  StockItem: { delegate: 'stockItem', label: 'คลังสินค้า' },
}

export const RESTORABLE_TABLES = Object.keys(MODELS)

type Row = Record<string, unknown>
const omit = (o: Row, keys: string[]): Row => { const r = { ...o }; for (const k of keys) delete r[k]; return r }

export type RestoreResult = { ok: boolean; error?: string }

// ย้อนคืนรายการตาม log id (เฉพาะ super admin — ตรวจสิทธิ์ที่ตัวเรียก)
export async function restoreAudit(logId: string, actor: { id?: string | null; name?: string | null } | null | undefined): Promise<RestoreResult> {
  const log = await prisma.auditLog.findUnique({ where: { id: logId } })
  if (!log) return { ok: false, error: 'ไม่พบรายการ' }
  if (!log.restorable || !log.refTable || !log.refId) return { ok: false, error: 'รายการนี้ย้อนคืนไม่ได้ (ไม่มีข้อมูลสำรอง)' }
  if (log.restoredAt) return { ok: false, error: 'รายการนี้ถูกย้อนคืนไปแล้ว' }
  const m = MODELS[log.refTable]
  if (!m) return { ok: false, error: 'ยังไม่รองรับการย้อนคืนหมวดนี้' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[m.delegate]
  const before = (log.beforeJson ?? null) as Row | null
  const after = (log.afterJson ?? null) as Row | null
  const id = log.refId

  const table = log.refTable
  try {
    // ── ยืม-คืน: ต้อง sync สถานะของในคลัง (ใช้เงื่อนไขสถานะกันทับงานที่เปลี่ยนไปแล้ว) ──
    if (table === 'Loan') {
      if (log.action === 'CREATE') {
        const itemId = (after as Row | null)?.itemId as string | undefined
        await prisma.loan.delete({ where: { id } }).catch(() => {})
        if (itemId) await prisma.stockItem.updateMany({ where: { id: itemId, status: 'BORROWED' }, data: { status: 'IN_STOCK' } })
      } else if (log.action === 'UPDATE') {
        if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองก่อนแก้ไข' }
        const cur = await prisma.loan.findUnique({ where: { id } })
        if (!cur) return { ok: false, error: 'ไม่พบรายการยืม-คืนปัจจุบัน' }
        await prisma.loan.update({ where: { id }, data: omit(before, ['id', 'createdAt', 'updatedAt', 'itemId']) as never })
        const itemId = (before as Row).itemId as string | undefined
        if (itemId && (before as Row).status === 'BORROWED') await prisma.stockItem.updateMany({ where: { id: itemId, status: 'IN_STOCK' }, data: { status: 'BORROWED' } })
      } else if (log.action === 'DELETE') {
        if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองของรายการที่ลบ' }
        if (await prisma.loan.findUnique({ where: { id } })) return { ok: false, error: 'มีรายการนี้อยู่แล้ว' }
        await prisma.loan.create({ data: omit(before, ['updatedAt']) as never })
      }
    }
    // ── คลังสินค้า: ลบชิ้นว่างต้องคืนจำนวนใน Lot ด้วย ──
    else if (table === 'StockItem' && log.action === 'DELETE') {
      if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองของรายการที่ลบ' }
      if (await prisma.stockItem.findUnique({ where: { id } })) return { ok: false, error: 'มีรายการนี้อยู่แล้ว' }
      await prisma.stockItem.create({ data: omit(before, ['updatedAt']) as never })
      const meta = after as Row | null
      if (meta?.lotDec && meta?.lotId) await prisma.stockLot.update({ where: { id: meta.lotId as string }, data: { receivedQty: { increment: 1 } } }).catch(() => {})
    }
    // ── โรงพยาบาล: คืนผู้ติดต่อด้วย ──
    else if (table === 'Hospital') {
      if (log.action === 'DELETE') {
        if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองของรายการที่ลบ' }
        if (await model.findUnique({ where: { id } })) return { ok: false, error: 'มีรายการนี้อยู่แล้ว' }
        const { contacts, ...h } = before as Row & { contacts?: Row[] }
        await prisma.hospital.create({ data: omit(h, ['updatedAt']) as never })
        if (Array.isArray(contacts) && contacts.length) await prisma.hospitalContact.createMany({ data: contacts.map((c) => omit(c, ['updatedAt'])) as never })
      } else if (log.action === 'UPDATE') {
        if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองก่อนแก้ไข' }
        if (!(await model.findUnique({ where: { id } }))) return { ok: false, error: 'ไม่พบรายการปัจจุบัน (อาจถูกลบไปแล้ว)' }
        const { contacts, ...h } = before as Row & { contacts?: Row[] }
        await prisma.hospital.update({ where: { id }, data: omit(h, ['id']) as never })
        await prisma.hospitalContact.deleteMany({ where: { hospitalId: id } })
        if (Array.isArray(contacts) && contacts.length) await prisma.hospitalContact.createMany({ data: contacts.map((c) => omit(c, ['updatedAt'])) as never })
      } else {
        const cur = await model.findUnique({ where: { id } }); if (cur) await model.delete({ where: { id } })
      }
    }
    // ── ทั่วไป: ตารางเดี่ยว ──
    else if (log.action === 'DELETE') {
      if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองของรายการที่ลบ' }
      if (await model.findUnique({ where: { id } })) return { ok: false, error: 'มีรายการนี้อยู่แล้ว ย้อนคืนไม่ได้' }
      await model.create({ data: omit(before, ['updatedAt']) })
    } else if (log.action === 'UPDATE') {
      if (!before) return { ok: false, error: 'ไม่มีข้อมูลสำรองก่อนแก้ไข' }
      if (!(await model.findUnique({ where: { id } }))) return { ok: false, error: 'ไม่พบรายการปัจจุบัน (อาจถูกลบไปแล้ว)' }
      await model.update({ where: { id }, data: omit(before, ['id', 'createdAt', 'updatedAt']) })
    } else if (log.action === 'CREATE') {
      const cur = await model.findUnique({ where: { id } })
      if (cur) await model.delete({ where: { id } })
    } else {
      return { ok: false, error: 'ชนิดการกระทำนี้ย้อนคืนไม่ได้' }
    }
  } catch {
    return { ok: false, error: 'ย้อนคืนไม่สำเร็จ — ข้อมูลอาจเชื่อมโยงกับส่วนอื่น หรือมีการเปลี่ยนแปลงที่ทำให้ย้อนไม่ได้' }
  }

  // ทำเครื่องหมายว่าย้อนแล้ว + บันทึก log การย้อน (ทิศทางกลับกัน)
  const inverse = log.action === 'DELETE' ? 'CREATE' : log.action === 'CREATE' ? 'DELETE' : 'UPDATE'
  await prisma.auditLog.update({ where: { id: logId }, data: { restoredAt: new Date(), restoredBy: actor?.name ?? null } }).catch(() => {})
  await logAction(actor, inverse as 'CREATE' | 'UPDATE' | 'DELETE', m.label, `↩ ย้อนคืน: ${log.summary}`)
  // ผลลัพธ์: after ถูกใช้เพื่ออนาคต (ตรวจ conflict) — ปัจจุบันยังไม่บล็อก
  void after
  return { ok: true }
}
