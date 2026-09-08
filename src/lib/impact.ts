import { confirmDialog, type ImpactItem } from './dialog'

// ดึง "ผลกระทบ" จาก API กลางแล้วเปิดป็อปอัพยืนยัน (สวยๆ ในเว็บ) ก่อนลบ/แก้
// ใช้ซ้ำได้ทุกจุด: await confirmWithImpact({ type:'hospital', id, title:'ลบ...' })
export async function confirmWithImpact(opts: {
  type: string
  id: string
  title: string
  danger?: boolean
  confirmText?: string
  cancelText?: string
  baseMessage?: string
}): Promise<boolean> {
  let impacts: ImpactItem[] = []
  let message = opts.baseMessage ?? ''
  try {
    const r = await fetch(`/api/impact?type=${encodeURIComponent(opts.type)}&id=${encodeURIComponent(opts.id)}`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json() as { impacts?: ImpactItem[]; message?: string }
      impacts = d.impacts ?? []
      if (d.message) message = d.message
    }
  } catch { /* เช็คไม่ได้ ก็ยังถามยืนยันตามปกติ */ }

  return confirmDialog({
    title: opts.title,
    message: message || 'ยืนยันการดำเนินการนี้?',
    danger: opts.danger ?? true,
    confirmText: opts.confirmText,
    cancelText: opts.cancelText,
    impacts,
  })
}
