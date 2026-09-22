import { NextResponse } from 'next/server'
import { listBpReadings } from '@/lib/bpTest'

export const dynamic = 'force-dynamic'

// สรุปเปรียบเทียบ "2 เครื่อง" แบบรวมทั้งหมด สำหรับหน้าผู้บริหาร (สาธารณะ)
// คำนวณที่เซิร์ฟเวอร์ → ส่งเฉพาะตัวเลขสรุป ไม่มีชื่อ/เลขบัตร/ค่าดิบรายคน
const NAME_WINDOW = 15 * 60 * 1000
const METRICS = ['systolic', 'diastolic', 'pulse'] as const
type MK = typeof METRICS[number]

export async function GET() {
  const readings = await listBpReadings()
  const asc = readings.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  // ยืมชื่อให้เรคคอร์ดที่ไม่มีชื่อ (เช่น Yuwell) จากเรคคอร์ดก่อนหน้าที่มีชื่อ ภายใน 15 นาที
  let last: { name: string; t: number } | null = null
  const eff = new Map<string, string>()
  for (const r of asc) {
    const raw = (r.name || '').trim(); const t = new Date(r.at).getTime()
    let e = raw
    if (raw) last = { name: raw, t }
    else if (last && t - last.t <= NAME_WINDOW) e = last.name
    eff.set(r.id, e || 'ไม่ระบุผู้วัด')
  }

  // 2 เครื่องที่ใช้บ่อยสุด
  const devCount = new Map<string, number>()
  for (const r of asc) { const d = r.device || 'ไม่ระบุเครื่อง'; devCount.set(d, (devCount.get(d) || 0) + 1) }
  const top = Array.from(devCount.entries()).sort((a, b) => b[1] - a[1])
  const d1 = top[0]?.[0] ?? null, d2 = top[1]?.[0] ?? null

  // จับคู่รายรอบต่อคน (dev1[i] เทียบ dev2[i]) แล้วรวม diff (dev1 - dev2)
  const byPerson = new Map<string, typeof asc>()
  for (const r of asc) { const k = eff.get(r.id)!; const a = byPerson.get(k) || []; a.push(r); byPerson.set(k, a) }
  const diffs: Record<MK, number[]> = { systolic: [], diastolic: [], pulse: [] }
  let pairRounds = 0
  const peopleCompared = new Set<string>()
  if (d1 && d2) {
    for (const [name, rs] of byPerson) {
      const a = rs.filter((r) => (r.device || 'ไม่ระบุเครื่อง') === d1)
      const b = rs.filter((r) => (r.device || 'ไม่ระบุเครื่อง') === d2)
      const n = Math.min(a.length, b.length)
      if (n > 0) peopleCompared.add(name)
      for (let i = 0; i < n; i++) {
        pairRounds++
        for (const k of METRICS) {
          const av = a[i][k], bv = b[i][k]
          if (av != null && bv != null) diffs[k].push(av - bv)
        }
      }
    }
  }

  const agg = (arr: number[]) => {
    const n = arr.length
    if (!n) return { n: 0, bias: null as number | null, mad: null as number | null, within5: 0, within10: 0, over10: 0, maxAbs: null as number | null }
    const abs = arr.map((x) => Math.abs(x))
    const round1 = (x: number) => Math.round(x * 10) / 10
    return {
      n,
      bias: round1(arr.reduce((s, x) => s + x, 0) / n),
      mad: round1(abs.reduce((s, x) => s + x, 0) / n),
      within5: abs.filter((x) => x <= 5).length,
      within10: abs.filter((x) => x > 5 && x <= 10).length,
      over10: abs.filter((x) => x > 10).length,
      maxAbs: Math.max(...abs),
    }
  }

  return NextResponse.json({
    devices: { d1, d2 },
    perDevice: { d1: d1 ? devCount.get(d1) || 0 : 0, d2: d2 ? devCount.get(d2) || 0 : 0 },
    totalReadings: asc.length,
    peopleCompared: peopleCompared.size,
    pairRounds,
    metrics: { systolic: agg(diffs.systolic), diastolic: agg(diffs.diastolic), pulse: agg(diffs.pulse) },
    updatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
