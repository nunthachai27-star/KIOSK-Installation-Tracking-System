import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/superAdmin'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// ดึงข้อมูลจากลิงก์ Google Sheet (ต้องแชร์ "ทุกคนที่มีลิงก์ดูได้")
// server เป็นคนดึง CSV เอง (กัน CORS) + จำกัดเฉพาะ docs.google.com (กัน SSRF)
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = (new URL(req.url).searchParams.get('url') || '').trim()
  const m = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)
  if (!m) return NextResponse.json({ error: 'bad url', message: 'ต้องเป็นลิงก์ Google Sheet (docs.google.com/spreadsheets/d/...)' }, { status: 400 })
  const id = m[1]
  const gidM = url.match(/[#&?]gid=(\d+)/)
  const gid = gidM ? gidM[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`

  let text = ''
  try {
    const res = await fetch(csvUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
    const ct = res.headers.get('content-type') || ''
    text = await res.text()
    // ชีตที่ไม่ได้แชร์สาธารณะ → Google ส่งหน้า HTML (login) กลับมา ไม่ใช่ CSV
    if (!res.ok || ct.includes('text/html') || /<html/i.test(text.slice(0, 200))) {
      return NextResponse.json({ error: 'not_public', message: 'เปิดชีตไม่ได้ — ตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์ดูได้" ก่อน' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'fetch_failed', message: 'ดึงข้อมูลจากลิงก์ไม่สำเร็จ' }, { status: 400 })
  }

  try {
    const wb = XLSX.read(text, { type: 'string', raw: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true })
    if (!grid.length) return NextResponse.json({ error: 'empty', message: 'ชีตว่าง' }, { status: 400 })
    // หาแถว header (แถวแรกที่มีคำว่า serial) แล้วส่ง headers + body กลับไปให้ client เลือกคอลัมน์ (เหมือนอัปไฟล์)
    let hIdx = grid.findIndex((r) => (r as unknown[]).some((c) => /serial|ซีเรียล/i.test(String(c ?? ''))))
    if (hIdx < 0) hIdx = 0
    const headers = (grid[hIdx] as unknown[]).map((c) => String(c ?? '').trim())
    const body = grid.slice(hIdx + 1)
    return NextResponse.json({ headers, grid: body }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'parse_failed', message: 'อ่านข้อมูลชีตไม่สำเร็จ' }, { status: 400 })
  }
}
