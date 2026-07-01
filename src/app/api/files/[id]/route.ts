import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, '')))
  return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': att.fileType } })
}
