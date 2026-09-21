import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveFatReading, listFatReadings, clearFatReadings, parseFat, parseDevice, parsePerson } from '@/lib/fatTest'

export const dynamic = 'force-dynamic'

// รับข้อมูลจากเครื่องวัดไขมัน/องค์ประกอบร่างกาย ผ่าน API gateway (สาธารณะ — ยิงเข้ามาโดยไม่มี login)
// ตั้งค่าปลายทาง upload = https://<host>/api/dev/fat
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

  const metrics = parseFat(raw)
  const person = parsePerson(raw)
  await saveFatReading({ device: parseDevice(raw), name: person.name, idcard: person.idcard, metrics, raw })

  // ตอบกลับแบบ "สำเร็จ" เผื่อ gateway ต้องการ ack (permissive)
  return NextResponse.json({ code: 0, success: true, message: 'received' }, { headers: { 'Cache-Control': 'no-store' } })
}

// อ่านค่าที่รับมาแล้ว (สำหรับหน้าเดชบอร์ด/รายงาน)
export async function GET() {
  return NextResponse.json({ readings: await listFatReadings() }, { headers: { 'Cache-Control': 'no-store' } })
}

// ล้างค่าทดสอบ (เฉพาะเจ้าหน้าที่)
export async function DELETE() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  await clearFatReadings()
  return NextResponse.json({ ok: true })
}
