import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Content types we trust to serve with their real MIME + inline. Anything else
// is served as an opaque download to prevent stored XSS (e.g. uploaded .html/.svg
// being rendered same-origin with a user-controlled Content-Type).
const INLINE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
])

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Require an authenticated session (defence-in-depth beyond middleware).
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // filePath is written by saveUpload as `/uploads/<safe-name>`; refuse anything
  // that isn't inside the uploads directory (path-traversal guard).
  if (!att.filePath.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const isInline = INLINE_TYPES.has(att.fileType)
  const contentType = isInline ? att.fileType : 'application/octet-stream'
  const disposition = isInline ? 'inline' : 'attachment'

  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, '')))
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(att.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
