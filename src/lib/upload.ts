import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from './prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export function safeFileName(original: string): string {
  const ext = (original.split('.').pop() || 'bin').toLowerCase()
  const base = original.replace(/\.[^.]+$/, '').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
  const stamp = Math.floor(performance.now() * 1000).toString(36)
  return `${base}-${stamp}.${ext}`
}

export async function saveUpload(file: File, refTable: string, refId: string, userId?: string) {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const name = safeFileName(file.name)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, name), buf)
  return prisma.attachment.create({
    data: { refTable, refId, fileName: file.name, fileType: file.type || 'application/octet-stream', filePath: `/uploads/${name}`, fileSize: buf.length, uploadedById: userId },
  })
}
