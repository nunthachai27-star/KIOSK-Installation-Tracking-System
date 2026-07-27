import { NextResponse } from 'next/server'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { UPLOAD_ROOT, MAX_FILE_BYTES, ensureUploadDir, extOf } from '@/lib/vault'

export const runtime = 'nodejs'

// Upload a team file. The raw file is sent as the request body (streamed to disk,
// never buffered whole in memory); metadata comes via query params + headers.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!req.body) return NextResponse.json({ error: 'no body', message: 'ไม่มีไฟล์' }, { status: 400 })

  const url = new URL(req.url)
  const hdrName = req.headers.get('x-file-name')
  const originalName = (hdrName ? decodeURIComponent(hdrName) : '').trim().slice(0, 255) || 'file'
  const displayName = (url.searchParams.get('name') || originalName).trim().slice(0, 200)
  const folderId = url.searchParams.get('folderId') || null
  const note = (url.searchParams.get('note') || '').trim().slice(0, 500) || null
  const mimeType = req.headers.get('content-type') || null
  const ext = extOf(originalName)

  const declared = Number(req.headers.get('content-length') || 0)
  if (declared && declared > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'too large', message: 'ไฟล์ใหญ่เกิน 500 MB' }, { status: 413 })
  }
  if (folderId) {
    const f = await prisma.fileFolder.findUnique({ where: { id: folderId }, select: { id: true } })
    if (!f) return NextResponse.json({ error: 'folder not found' }, { status: 404 })
  }

  await ensureUploadDir()
  const stored = `${randomUUID()}${ext ?? ''}`
  const dest = path.join(UPLOAD_ROOT, stored)

  // Stream to disk with backpressure + a hard size cap (backstop vs a lying header).
  const ws = createWriteStream(dest)
  const reader = req.body.getReader()
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > MAX_FILE_BYTES) throw new Error('too_large')
      if (!ws.write(value)) await new Promise<void>((r) => ws.once('drain', () => r()))
    }
    await new Promise<void>((res, rej) => ws.end((err?: Error | null) => (err ? rej(err) : res())))
  } catch (e) {
    ws.destroy()
    await unlink(dest).catch(() => {})
    if (e instanceof Error && e.message === 'too_large') {
      return NextResponse.json({ error: 'too large', message: 'ไฟล์ใหญ่เกิน 500 MB' }, { status: 413 })
    }
    return NextResponse.json({ error: 'upload failed', message: 'อัปโหลดไม่สำเร็จ' }, { status: 500 })
  }

  if (total === 0) { await unlink(dest).catch(() => {}); return NextResponse.json({ error: 'empty', message: 'ไฟล์ว่าง' }, { status: 400 }) }

  const created = await prisma.fileAsset.create({
    data: {
      folderId, name: displayName, originalName, ext, mimeType, size: total, note,
      storedPath: stored, uploadedByName: session.user.name ?? null,
    },
    select: { id: true, name: true, size: true },
  })
  await logAction(session.user, 'CREATE', 'ไฟล์ทีม', `อัปโหลด "${displayName}" (${(total / 1048576).toFixed(1)}MB)`)
  return NextResponse.json(created, { status: 201 })
}
