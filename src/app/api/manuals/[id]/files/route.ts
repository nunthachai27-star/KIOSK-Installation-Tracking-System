import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUpload } from '@/lib/upload'

export const dynamic = 'force-dynamic'

// อัปโหลดไฟล์คู่มือ (แนบกับ Manual)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const manual = await prisma.manual.findUnique({ where: { id }, select: { id: true } })
  if (!manual) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await req.formData()
  const files = form.getAll('file').filter((f): f is File => f instanceof File)
  if (!files.length) return NextResponse.json({ error: 'no file' }, { status: 400 })
  const saved = []
  for (const f of files) {
    const a = await saveUpload(f, 'Manual', id, session.user.id)
    saved.push({ id: a.id, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })
  }
  return NextResponse.json({ files: saved }, { status: 201 })
}
