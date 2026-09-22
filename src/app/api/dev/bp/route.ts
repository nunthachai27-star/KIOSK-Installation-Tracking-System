import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveBpReading, listBpReadings, clearBpReadings, parseBp, parseDevice, parsePerson, parseExamNo, maskId } from '@/lib/bpTest'
import { ingestGuard, MAX_INGEST_BYTES } from '@/lib/devIngest'
import { isSuperAdmin } from '@/lib/superAdmin'
import { logIngest, reqIp } from '@/lib/ingestLog'

export const dynamic = 'force-dynamic'

// รับข้อมูลจากเครื่องวัดความดัน (สาธารณะ — เครื่องยิงเข้ามาโดยไม่มี login)
// ตั้งค่าในเครื่อง: "แก้ไขที่อยู่สำหรับอัปโหลดข้อมูล" = https://<host>/api/dev/bp
export async function POST(req: Request) {
  const ip = reqIp(req)
  const blocked = ingestGuard(req)
  if (blocked) { await logIngest({ kind: 'bp', ip, status: blocked.status === 413 ? 'too_large' : 'rate_limit' }); return blocked }

  const text = await req.text().catch(() => '')
  const bytes = text.length
  if (bytes > MAX_INGEST_BYTES) {
    await logIngest({ kind: 'bp', ip, bytes, status: 'too_large' })
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
  const device = parseDevice(raw)
  const examNo = parseExamNo(raw)
  const hasVal = bp.systolic != null || bp.diastolic != null || bp.pulse != null
  const res = await saveBpReading({ device, name: person.name, idcard: person.idcard, ...bp, examNo, raw })
  await logIngest({
    kind: 'bp', device, name: person.name, ip, bytes,
    status: res === 'duplicate' ? 'duplicate' : hasVal ? 'ok' : 'no_value',
    summary: hasVal ? `${bp.systolic ?? '-'}/${bp.diastolic ?? '-'} p${bp.pulse ?? '-'}${examNo ? ` · #${examNo}` : ''}` : 'ไม่มีค่า',
  })

  // ตอบกลับแบบ "สำเร็จ" เผื่อเครื่องต้องการ ack (permissive)
  return NextResponse.json({ code: 0, success: true, message: 'received' }, { headers: { 'Cache-Control': 'no-store' } })
}

// อ่านค่าที่รับมาแล้ว (สำหรับหน้าเดชบอร์ด/รายงาน)
// - เจ้าหน้าที่ (OFFICE): เห็นข้อมูลเต็ม + raw (ใช้ในเดชบอร์ด)
// - สาธารณะ (หน้ารายงาน): ปิดบังเลขบัตร + ตัด raw ออก (กันข้อมูลส่วนบุคคลรั่ว)
export async function GET(req: Request) {
  const nameQ = (new URL(req.url).searchParams.get('name') || '').trim().toLowerCase()
  const session = await auth()
  let readings = await listBpReadings()
  // กรองตามชื่อ + "ยืมชื่อ": เรคคอร์ดที่ไม่มีชื่อ(เช่น Yuwell) ที่วัดต่อจากเรคคอร์ดที่มีชื่อภายใน 15 นาที
  // ถือเป็นของคนนั้น → หน้าสาธารณะกรอกชื่อแล้วเห็นครบ 2 เครื่อง โดยไม่ส่งข้อมูลคนอื่นมา
  if (nameQ) {
    const WINDOW = 15 * 60 * 1000
    const asc = readings.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    let last: { name: string; t: number } | null = null
    const effOf = new Map<string, string>()
    for (const r of asc) {
      const raw = (r.name || '').trim(); const t = new Date(r.at).getTime()
      let eff = raw
      if (raw) last = { name: raw, t }
      else if (last && t - last.t <= WINDOW) eff = last.name
      effOf.set(r.id, (eff || 'ไม่ระบุผู้วัด').toLowerCase())
    }
    readings = readings.filter((r) => effOf.get(r.id) === nameQ)
  }
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
  const deleted = await clearBpReadings(name)
  return NextResponse.json({ ok: true, deleted })
}
