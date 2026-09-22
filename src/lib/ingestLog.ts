import { prisma } from './prisma'

export type IngestStatus = 'ok' | 'duplicate' | 'rate_limit' | 'too_large' | 'unparsed' | 'no_value'

// บันทึกทุกครั้งที่เครื่องยิงข้อมูลเข้าเว็บ (best-effort — ไม่ให้ล้มการรับค่า)
export async function logIngest(f: {
  kind: 'bp' | 'fat'; device?: string | null; name?: string | null; ip?: string | null
  status: IngestStatus; bytes?: number; summary?: string | null
}): Promise<void> {
  try {
    await prisma.ingestLog.create({
      data: {
        kind: f.kind, device: f.device ?? null, name: f.name ?? null, ip: f.ip ?? null,
        status: f.status, bytes: f.bytes ?? null, summary: f.summary ?? null,
      },
    })
    // เก็บ log 30 วัน (สุ่มเก็บกวาดเป็นบางครั้ง)
    if (Math.random() < 0.04) {
      await prisma.ingestLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } }).catch(() => {})
    }
  } catch { /* ไม่ให้กระทบการรับค่า */ }
}

export async function listIngestLog(limit = 300) {
  const rows = await prisma.ingestLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  return rows.map((r) => ({
    id: r.id, at: r.createdAt.toISOString(), kind: r.kind, device: r.device,
    name: r.name, ip: r.ip, status: r.status, bytes: r.bytes, summary: r.summary,
  }))
}

// helper ดึง IP จาก request
export function reqIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}
