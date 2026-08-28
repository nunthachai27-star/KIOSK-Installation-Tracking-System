import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

// ── ตัวช่วยฝั่งเซิร์ฟเวอร์ของโชว์เคสโปรดัก Kiosk ──────────────────────────────
export function str(v: unknown, max: number, opts?: { multiline?: boolean }): string {
  if (typeof v !== 'string') return ''
  const s = v.replace(/\r\n?/g, '\n').replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
  if (opts?.multiline) return s.replace(/[ \t]+/g, ' ').split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

export function reqIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  return (req.headers.get('x-real-ip') || xff?.split(',').pop() || '').trim() || null
}

const IMG_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export type ProductView = {
  id: string; name: string; tagline: string | null; category: string | null
  priceLabel: string | null; priceNote: string | null
  features: string[]; specs: string[]; imageId: string | null
}

export async function listProducts(): Promise<ProductView[]> {
  const rows = await prisma.kioskProduct.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  const imgs = await prisma.attachment.findMany({
    where: { refTable: 'KioskProduct', refId: { in: rows.map((r) => r.id) } },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, refId: true },
  })
  const imgOf = new Map<string, string>()
  for (const a of imgs) if (!imgOf.has(a.refId)) imgOf.set(a.refId, a.id) // ใช้รูปล่าสุด
  const lines = (s: string | null) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
  return rows.map((r) => ({
    id: r.id, name: r.name, tagline: r.tagline, category: r.category,
    priceLabel: r.priceLabel, priceNote: r.priceNote,
    features: lines(r.features), specs: lines(r.specs), imageId: imgOf.get(r.id) ?? null,
  }))
}

export async function serveProductImage(attId: string): Promise<Response> {
  const att = await prisma.attachment.findUnique({ where: { id: attId } })
  if (!att || att.refTable !== 'KioskProduct' || !IMG_TYPES.has(att.fileType) || !att.filePath.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, '')))
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': att.fileType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(att.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export function isProductImage(type: string, size: number): boolean {
  return IMG_TYPES.has(type) && size > 0 && size <= 8 * 1024 * 1024
}
