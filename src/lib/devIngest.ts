import { NextResponse } from 'next/server'

// ตัวกันสแปม/DoS สำหรับ endpoint สาธารณะที่รับค่าจากเครื่อง (bp/fat)
// - จำกัดขนาด payload (กัน body ใหญ่มากินหน่วยความจำ)
// - จำกัดจำนวนครั้งต่อ IP ต่อช่วงเวลา (กันยิงถล่ม) — นับใน memory (รีเซ็ตเมื่อ deploy, พอสำหรับงานภายใน)
// ตั้งเพดานให้กว้างพอสำหรับเครื่องจริง (วัด 1 ครั้งอาจยิง 2-3 เรคคอร์ดใน 2-3 วิ)
const hits = new Map<string, number[]>()

export function ingestGuard(
  req: Request,
  { limit = 60, windowMs = 60_000, maxBytes = 512_000 }: { limit?: number; windowMs?: number; maxBytes?: number } = {},
): NextResponse | null {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > maxBytes) {
    return NextResponse.json({ code: 1, success: false, message: 'payload too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  hits.set(ip, arr)
  // เก็บกวาด IP ที่หมดอายุ กัน map โตไม่จำกัด
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  }
  if (arr.length > limit) {
    return NextResponse.json({ code: 1, success: false, message: 'rate limit exceeded' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
  }
  return null
}

export const MAX_INGEST_BYTES = 512_000
