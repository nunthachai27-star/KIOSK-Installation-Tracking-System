import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// เสิร์ฟหน้าเครื่องมือ "ออกแบบปุ่ม Kiosk" (ไฟล์ HTML ก้อนเดียว ฝังฟอนต์+เอนจินครบ).
// เก็บไฟล์ไว้นอก public/ เพื่อให้เข้าได้ทาง URL เดียว (/kiosk-buttons) — อ่านครั้งเดียวแล้ว cache.
let cached: string | null = null

export async function GET() {
  if (cached === null) {
    cached = await readFile(
      path.join(process.cwd(), 'src', 'tools', 'kiosk-button-tool.html'),
      'utf8',
    )
  }
  return new Response(cached, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
