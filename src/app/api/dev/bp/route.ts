import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveBpReading, listBpReadings, clearBpReadings, parseBp, parseDevice, parsePerson, maskId } from '@/lib/bpTest'
import { ingestGuard, MAX_INGEST_BYTES } from '@/lib/devIngest'

export const dynamic = 'force-dynamic'

// รับข้อมูลจากเครื่องวัดความดัน (สาธารณะ — เครื่องยิงเข้ามาโดยไม่มี login)
// ตั้งค่าในเครื่อง: "แก้ไขที่อยู่สำหรับอัปโหลดข้อมูล" = https://<host>/api/dev/bp
export async function POST(req: Request) {
  const blocked = ingestGuard(req)
  if (blocked) return blocked

  const text = await req.text().catch(() => '')
  if (text.length > MAX_INGEST_BYTES) {
    return NextResponse.json({ code: 1, success: false, message: 'payload too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
  }
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
  const person = parsePerson(raw)
  await saveBpReading({ device: parseDevice(raw), name: person.name, idcard: person.idcard, ...bp, raw })

  // ตอบกลับแบบ "สำเร็จ" เผื่อเครื่องต้องการ ack (permissive)
  return NextResponse.json({ code: 0, success: true, message: 'received' }, { headers: { 'Cache-Control': 'no-store' } })
}

// อ่านค่าที่รับมาแล้ว (สำหรับหน้าเดชบอร์ด/รายงาน)
// - เจ้าหน้าที่ (OFFICE): เห็นข้อมูลเต็ม + raw (ใช้ในเดชบอร์ด)
// - สาธารณะ (หน้ารายงาน): ปิดบังเลขบัตร + ตัด raw ออก (กันข้อมูลส่วนบุคคลรั่ว)
export async function GET() {
  const session = await auth()
  const readings = await listBpReadings()
  if (session?.user?.role === 'OFFICE') {
    return NextResponse.json({ readings }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const publicReadings = readings.map(({ raw, idcard, ...r }) => ({ ...r, idcard: maskId(idcard) }))
  return NextResponse.json({ readings: publicReadings }, { headers: { 'Cache-Control': 'no-store' } })
}

// ล้างค่าทดสอบ (เฉพาะเจ้าหน้าที่)
export async function DELETE() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  await clearBpReadings()
  return NextResponse.json({ ok: true })
}
