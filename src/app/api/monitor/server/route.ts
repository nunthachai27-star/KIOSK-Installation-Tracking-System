import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/superAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// อ่านสถานะเครื่อง (host) จาก /proc — loadavg/meminfo ไม่ถูก namespace จึงเห็นค่าทั้งเครื่อง
// ใช้ให้ super admin ดูว่าช่วงไหน load ต่ำ/แรมว่าง พอจะ deploy ได้
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const [loadRaw, memRaw] = await Promise.all([
      readFile('/proc/loadavg', 'utf8').catch(() => ''),
      readFile('/proc/meminfo', 'utf8').catch(() => ''),
    ])
    const parts = loadRaw.trim().split(/\s+/)
    const load1 = Number(parts[0]) || 0
    const load5 = Number(parts[1]) || 0
    const load15 = Number(parts[2]) || 0

    const mem: Record<string, number> = {}
    for (const line of memRaw.split('\n')) {
      const m = line.match(/^(\w+):\s+(\d+)\s*kB/)
      if (m) mem[m[1]] = Number(m[2]) // kB
    }
    const kbToMb = (kb: number) => Math.round((kb || 0) / 1024)
    const memTotal = kbToMb(mem.MemTotal)
    const memAvailable = kbToMb(mem.MemAvailable)
    const memUsed = Math.max(0, memTotal - memAvailable)
    const swapTotal = kbToMb(mem.SwapTotal)
    const swapFree = kbToMb(mem.SwapFree)
    const swapUsed = Math.max(0, swapTotal - swapFree)

    // ประเมินว่าปลอดภัยที่จะ deploy ไหม (load ต่ำ + แรมพอ)
    let deploy: 'ok' | 'caution' | 'avoid' = 'ok'
    if (load1 >= 6 || memAvailable < 500) deploy = 'avoid'
    else if (load1 >= 3 || memAvailable < 1000 || (swapTotal > 0 && swapUsed / swapTotal > 0.9)) deploy = 'caution'

    const cores = (() => { try { return os.cpus().length } catch { return 0 } })()
    return NextResponse.json(
      { at: new Date().toISOString(), cores, load1, load5, load15, memTotal, memAvailable, memUsed, swapTotal, swapUsed, deploy },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }
}
