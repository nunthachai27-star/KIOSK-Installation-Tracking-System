import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { addBpReading, getBpReadings, clearBpReadings, parseBp, parseDevice, type BpReading } from '@/lib/bpTest'

export const dynamic = 'force-dynamic'

// รับข้อมูลจากเครื่องวัดความดัน (สาธารณะ — เครื่องยิงเข้ามาโดยไม่มี login)
// ตั้งค่าในเครื่อง: "แก้ไขที่อยู่สำหรับอัปโหลดข้อมูล" = https://<host>/api/dev/bp
export async function POST(req: Request) {
  const text = await req.text().catch(() => '')
  let raw: unknown = text
  // พยายามอ่านเป็น JSON ก่อน, ถ้าไม่ใช่ค่อยลอง form-urlencoded
  try { raw = JSON.parse(text) } catch {
    try {
      const p = new URLSearchParams(text)
      const o: Record<string, string> = {}
      for (const [k, v] of p.entries()) o[k] = v
      if (Object.keys(o).length) raw = o
    } catch { /* เก็บเป็น text ดิบ */ }
  }

  const bp = parseBp(raw)
  const reading: BpReading = {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())),
    at: new Date().toISOString(),
    device: parseDevice(raw),
    ...bp,
    raw,
  }
  addBpReading(reading)

  // ตอบกลับแบบ "สำเร็จ" เผื่อเครื่องต้องการ ack (permissive)
  return NextResponse.json({ code: 0, success: true, message: 'received' }, { headers: { 'Cache-Control': 'no-store' } })
}

// อ่านค่าที่รับมาแล้ว (สำหรับหน้าเดชบอร์ดทดสอบ)
export async function GET() {
  return NextResponse.json({ readings: getBpReadings() }, { headers: { 'Cache-Control': 'no-store' } })
}

// ล้างค่าทดสอบ (เฉพาะเจ้าหน้าที่)
export async function DELETE() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  clearBpReadings()
  return NextResponse.json({ ok: true })
}
