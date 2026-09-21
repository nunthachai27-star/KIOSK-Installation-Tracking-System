import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

export type ManualFile = { id: string; fileName: string; fileType: string; fileSize: number }
export type ManualDTO = {
  id: string; title: string; description: string | null; category: string | null
  linkUrl: string | null; token: string; files: ManualFile[]; createdAt: string
}

async function filesFor(ids: string[]): Promise<Map<string, ManualFile[]>> {
  const map = new Map<string, ManualFile[]>()
  if (!ids.length) return map
  const atts = await prisma.attachment.findMany({
    where: { refTable: 'Manual', refId: { in: ids } },
    orderBy: { uploadedAt: 'asc' },
  })
  for (const a of atts) {
    const arr = map.get(a.refId) ?? []
    arr.push({ id: a.id, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })
    map.set(a.refId, arr)
  }
  return map
}

const toDto = (m: { id: string; title: string; description: string | null; category: string | null; linkUrl: string | null; token: string; createdAt: Date }, files: ManualFile[]): ManualDTO => ({
  id: m.id, title: m.title, description: m.description, category: m.category, linkUrl: m.linkUrl, token: m.token, files, createdAt: m.createdAt.toISOString(),
})

export async function listManuals(): Promise<ManualDTO[]> {
  const manuals = await prisma.manual.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  const map = await filesFor(manuals.map((m) => m.id))
  return manuals.map((m) => toDto(m, map.get(m.id) ?? []))
}

export async function getManualByToken(token: string): Promise<ManualDTO | null> {
  const m = await prisma.manual.findUnique({ where: { token } })
  if (!m || !m.active) return null
  const map = await filesFor([m.id])
  return toDto(m, map.get(m.id) ?? [])
}

// เสิร์ฟไฟล์คู่มือแบบสาธารณะ (ตรวจว่าเป็นไฟล์ของ Manual จริง) — รูป/PDF เปิดในหน้าได้, อื่นๆ บังคับดาวน์โหลด
export async function serveManualFile(attId: string, dl: boolean): Promise<Response> {
  const att = await prisma.attachment.findUnique({ where: { id: attId } })
  if (!att || att.refTable !== 'Manual' || !att.filePath.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, ''))).catch(() => null)
  if (!buf) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const viewable = att.fileType.startsWith('image/') || att.fileType === 'application/pdf'
  const disp = dl || !viewable ? 'attachment' : 'inline'
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': att.fileType,
      'Content-Disposition': `${disp}; filename="${encodeURIComponent(att.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
