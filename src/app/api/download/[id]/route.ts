import { NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'node:fs'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/prisma'
import { resolveStored } from '@/lib/vault'

export const runtime = 'nodejs'

// Public download of a team file by id (id is an unguessable cuid — "anyone with
// the link"). Always served as an attachment to avoid any inline/XSS risk.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await prisma.fileAsset.findUnique({
    where: { id },
    select: { name: true, originalName: true, ext: true, mimeType: true, size: true, storedPath: true },
  })
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const abs = resolveStored(file.storedPath)
  if (!abs || !existsSync(abs)) return NextResponse.json({ error: 'file missing' }, { status: 404 })

  // APKs get their proper type so Android offers to install; everything else is opaque.
  const ct = file.ext === '.apk' ? 'application/vnd.android.package-archive' : (file.mimeType || 'application/octet-stream')
  const filename = file.originalName || `${file.name}${file.ext ?? ''}`

  prisma.fileAsset.update({ where: { id }, data: { downloads: { increment: 1 } } }).catch(() => {})

  const stream = Readable.toWeb(createReadStream(abs)) as unknown as ReadableStream
  return new Response(stream, {
    headers: {
      'Content-Type': ct,
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
