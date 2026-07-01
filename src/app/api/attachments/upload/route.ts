import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveUpload } from '@/lib/upload'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  const refTable = String(form.get('refTable') || '')
  const refId = String(form.get('refId') || '')
  if (!file || !refTable || !refId) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  const att = await saveUpload(file, refTable, refId, session.user.id)
  return NextResponse.json({ id: att.id, filePath: att.filePath })
}
