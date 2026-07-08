type CloseInput = {
  handover?: { handoverStatus: string } | null
  invoice?: { status: string } | null
}

export function canCloseJob(job: CloseInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (job.handover?.handoverStatus !== 'DELIVERED') reasons.push('ยังไม่ส่งมอบงาน')
  // Invoice counts as done once issued or handed to accounting.
  const invoiceDone = job.invoice?.status === 'ISSUED' || job.invoice?.status === 'SENT_TO_ACCOUNTING'
  if (!invoiceDone) reasons.push('ยังไม่เปิดใบแจ้งหนี้')
  return { ok: reasons.length === 0, reasons }
}
