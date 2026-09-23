import { prisma } from './prisma'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

// Record a main user action (add/edit/delete). Best-effort: any failure here must
// never break the real operation, so it's wrapped and swallowed.
export async function logAction(
  actor: { id?: string | null; name?: string | null } | null | undefined,
  action: AuditAction,
  entity: string,
  summary: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId: actor?.id ?? null, userName: actor?.name ?? null, action, entity, summary },
    })
  } catch {
    // logging must not affect the primary write
  }
}

// เหมือน logAction แต่เก็บ snapshot ไว้ให้ super admin "ย้อนคืน" ได้ (เฟส 1: ตารางเดี่ยว)
// before = ค่าก่อนเปลี่ยน (UPDATE/DELETE), after = ค่าหลัง (CREATE/UPDATE)
export async function logChange(
  actor: { id?: string | null; name?: string | null } | null | undefined,
  action: AuditAction,
  entity: string,
  summary: string,
  snap: { refTable: string; refId: string; before?: unknown; after?: unknown },
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor?.id ?? null, userName: actor?.name ?? null, action, entity, summary,
        refTable: snap.refTable, refId: snap.refId,
        beforeJson: (snap.before ?? undefined) as never,
        afterJson: (snap.after ?? undefined) as never,
        restorable: true,
      },
    })
  } catch {
    // logging must not affect the primary write
  }
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, { label: string; color: string; bg: string }> = {
  CREATE: { label: 'เพิ่ม', color: '#157F4C', bg: '#E2F3EA' },
  UPDATE: { label: 'แก้ไข', color: '#1B5FD9', bg: '#E4EEFF' },
  DELETE: { label: 'ลบ', color: '#C13540', bg: '#FBE4E4' },
}
