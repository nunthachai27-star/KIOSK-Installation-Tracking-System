import crypto from 'node:crypto'
import type { IssueStatus, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { ISSUE_STATUS } from './issue'

// เชื่อม Vira (Call Center) — สเปก "Vira ⇄ ระบบทีม Kiosk" ฉบับ 9 พ.ย. 2026
//  ขาเข้า: Vira ยิง webhook มาที่ /api/vira/events (ตรวจ Bearer + HMAC ด้วยค่าที่เราออกให้ Vira)
//  ขาออก: เราแจ้งความคืบหน้ากลับผ่านคิว ViraOutbox (ส่งไม่ผ่าน → ลองใหม่ตามรอบ ไม่บล็อกหน้าเว็บ)
//
// ตั้งค่าใน .env ของ prod:
//   VIRA_INBOUND_KEY      = API key ที่เราออกให้ Vira (Vira ส่งมาใน Authorization: Bearer)
//   VIRA_SIGNING_SECRET   = signing secret ที่เราออกให้ Vira (ใช้ตรวจ X-Vira-Signature)
//   VIRA_API_KEY          = API key ที่ Vira ออกให้ทีม Kiosk (ใช้เรียก /api/team/*)
//   VIRA_BASE_URL         = https://vira.bmscloud.in.th (ค่าเริ่มต้น)

const BASE = () => (process.env.VIRA_BASE_URL || 'https://vira.bmscloud.in.th').replace(/\/+$/, '')

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// ตรวจว่าเป็น Vira จริง: Bearer key ตรง และลายเซ็น HMAC-SHA256 ของ body ดิบตรง
export function verifyViraRequest(headers: Headers, rawBody: string): boolean {
  const key = process.env.VIRA_INBOUND_KEY, secret = process.env.VIRA_SIGNING_SECRET
  if (!key || !secret) return false
  const auth = headers.get('authorization') ?? ''
  if (!safeEqual(auth, `Bearer ${key}`)) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(headers.get('x-vira-signature') ?? '', expected)
}

// สถานะงานของเรา → สถานะที่ Vira รับ (received · in_progress · waiting · done · cancelled)
export function viraStatusFor(status: IssueStatus, solution: string | null): { status: string; note?: string } {
  switch (status) {
    case 'RECEIVED': return { status: 'received' }
    case 'IN_PROGRESS': return { status: 'in_progress', ...(solution ? { note: solution } : {}) }
    case 'DONE': return { status: 'done', note: solution || 'ทีม Kiosk ดำเนินการเสร็จแล้ว' }
    case 'REJECTED': return { status: 'cancelled', note: solution || 'ทีม Kiosk ไม่รับเรื่องนี้' }
    default: return { status: 'waiting', note: ISSUE_STATUS[status].label + (solution ? ` · ${solution}` : '') }
  }
}

export const viraTaskRef = (issueId: string) => `KI-${issueId.slice(-8).toUpperCase()}`

// ใส่คิวแจ้งสถานะของงานที่มาจาก Vira (เรียกหลังเปลี่ยนสถานะ) แล้วลองส่งทันที
export async function queueViraProgress(issueId: string): Promise<void> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, status: true, solution: true, viraKind: true, viraRef: true, viraClosedAt: true, assignedTo: { select: { name: true } } },
  })
  if (!issue?.viraRef || issue.viraClosedAt || (issue.viraKind !== 'case' && issue.viraKind !== 'request')) return
  const s = viraStatusFor(issue.status, issue.solution)
  const body = {
    ...(issue.viraKind === 'case' ? { handoff_id: issue.viraRef } : { request_id: issue.viraRef }),
    status: s.status,
    ...(s.note ? { note: s.note.slice(0, 2000) } : {}),
    ref: viraTaskRef(issue.id),
    ...(issue.assignedTo?.name ? { staff_name: issue.assignedTo.name.slice(0, 60) } : {}),
  }
  const path = issue.viraKind === 'case' ? '/api/team/cases/update' : '/api/team/requests/update'
  await prisma.viraOutbox.create({ data: { path, body, issueId: issue.id } })
  // done/cancelled = จบงานฝั่ง Vira แล้ว ไม่ส่งสถานะต่อ
  if (s.status === 'done' || s.status === 'cancelled') await prisma.issue.update({ where: { id: issue.id }, data: { viraClosedAt: new Date() } })
  void flushViraOutbox()
}

export async function queueViraCall(path: string, body: Prisma.InputJsonValue, issueId: string | null): Promise<void> {
  await prisma.viraOutbox.create({ data: { path, body, issueId } })
  void flushViraOutbox()
}

const BACKOFF_MIN = [1, 5, 15, 60, 180]
let flushing = false

// ส่งงานในคิวที่ถึงรอบ — 2xx/409 = สำเร็จ · 4xx อื่น = ผิดถาวร · 5xx/408/429/เน็ตล่ม = ลองใหม่
export async function flushViraOutbox(): Promise<void> {
  const key = process.env.VIRA_API_KEY
  if (!key || flushing) return // ยังไม่ได้คีย์จาก Vira → เก็บไว้ในคิวก่อน ได้คีย์แล้วจะส่งตามไป
  flushing = true
  try {
    const due = await prisma.viraOutbox.findMany({
      where: { status: 'PENDING', nextAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: 20,
    })
    for (const job of due) {
      let ok = false, retry = false, err = ''
      try {
        const res = await fetch(BASE() + job.path, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(job.body),
          signal: AbortSignal.timeout(10_000),
        })
        ok = res.ok || res.status === 409
        retry = res.status >= 500 || res.status === 408 || res.status === 429
        if (!ok) err = `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`
      } catch (e) {
        retry = true
        err = e instanceof Error ? e.message : String(e)
      }
      const attempts = job.attempts + 1
      if (ok) {
        await prisma.viraOutbox.update({ where: { id: job.id }, data: { status: 'SENT', attempts, sentAt: new Date(), lastError: null } })
      } else if (retry && attempts <= BACKOFF_MIN.length) {
        await prisma.viraOutbox.update({ where: { id: job.id }, data: { attempts, lastError: err, nextAt: new Date(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000) } })
      } else {
        await prisma.viraOutbox.update({ where: { id: job.id }, data: { status: 'FAILED', attempts, lastError: err } })
      }
    }
  } catch (e) {
    console.error('[vira] flush failed', e)
  } finally {
    flushing = false
  }
}
