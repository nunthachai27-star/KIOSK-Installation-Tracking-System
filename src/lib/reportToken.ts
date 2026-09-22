import { createHmac } from 'crypto'

// token ลับสำหรับลิงก์รายงานสาธารณะ (เดาไม่ได้ แต่คงที่ต่อระบบ) — ผูกกับ AUTH_SECRET
// ใช้กับ /bp-report/<token> และ /fat-report/<token> เพื่อไม่ให้เดา URL ตรงๆ ได้
export function reportToken(kind: 'bp' | 'fat' | 'bpsum'): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'kiosk-report-fallback-secret'
  return createHmac('sha256', secret).update('report:' + kind).digest('hex').slice(0, 24)
}
