import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveFatReading, listFatReadings, clearFatReadings, parseFat, parseDevice, parsePerson, maskId } from '@/lib/fatTest'
import { ingestGuard, MAX_INGEST_BYTES } from '@/lib/devIngest'
import { isSuperAdmin } from '@/lib/superAdmin'

export const dynamic = 'force-dynamic'

// รับข้อมูลจากเครื่องวัดไขมัน/องค์ประกอบร่างกาย ผ่าน API gateway (สาธารณะ — ยิงเข้ามาโดยไม่มี login)
// ตั้งค่าปลายทาง upload = https://<host>/api/dev/fat
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

  const { metrics, refs } = parseFat(raw)
  const person = parsePerson(raw)
  await saveFatReading({ device: parseDevice(raw), name: person.name, idcard: person.idcard, metrics, refs, raw })

  // ตอบกลับแบบ "สำเร็จ" เผื่อ gateway ต้องการ ack (permissive)
  return NextResponse.json({ code: 0, success: true, message: 'received' }, { headers: { 'Cache-Control': 'no-store' } })
}

// อ่านค่าที่รับมาแล้ว (สำหรับหน้าเดชบอร์ด/รายงาน)
// - เจ้าหน้าที่ (OFFICE): เห็นข้อมูลเต็ม + raw (ใช้ในเดชบอร์ด)
// - สาธารณะ (หน้ารายงาน): ปิดบังเลขบัตร + ตัด raw ออก (กันข้อมูลส่วนบุคคลรั่ว)
export async function GET(req: Request) {
  const nameQ = (new URL(req.url).searchParams.get('name') || '').trim().toLowerCase()
  const session = await auth()
  let readings = await listFatReadings()
  // กรองตามชื่อ (หน้าสาธารณะกรอกชื่อ → ดึงเฉพาะคนนั้น ไม่ส่งข้อมูลคนอื่นมา)
  if (nameQ) readings = readings.filter((r) => (r.name || '').trim().toLowerCase() === nameQ)
  if (session?.user?.role === 'OFFICE') {
    return NextResponse.json({ readings }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const publicReadings = readings.map(({ raw, idcard, ...r }) => ({ ...r, idcard: maskId(idcard) }))
  return NextResponse.json({ readings: publicReadings }, { headers: { 'Cache-Control': 'no-store' } })
}

// ลบข้อมูล — เฉพาะ super admin เท่านั้น · ?name= ลบเฉพาะคนนั้น, ไม่ใส่ = ลบทั้งหมด
export async function DELETE(req: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const name = new URL(req.url).searchParams.get('name') || undefined
  const deleted = await clearFatReadings(name)
  return NextResponse.json({ ok: true, deleted })
}
