import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Public: a hospital rates the staff's resolution (no login). id = issue id.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true, rating: true, assignedToId: true } })
  if (!issue) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Layer 1: a logged-in staff member cannot submit (the link is for hospitals).
  // The resolver rating their own work is called out explicitly.
  const session = await auth()
  if (session?.user) {
    const message = session.user.id === issue.assignedToId
      ? 'ไม่สามารถประเมินงานที่ตนเองเป็นผู้รับผิดชอบได้'
      : 'ลิงก์นี้สำหรับให้โรงพยาบาลประเมิน — เจ้าหน้าที่ไม่สามารถให้คะแนนได้ (กรุณาส่งลิงก์ให้ รพ.)'
    return NextResponse.json({ error: 'staff_forbidden', message }, { status: 403 })
  }

  // Layer 2: one rating only — cannot be changed once submitted (prevents tampering).
  if (issue.rating != null) {
    return NextResponse.json({ error: 'already_rated', message: 'รายการนี้ได้รับการประเมินแล้ว ขอบคุณครับ' }, { status: 409 })
  }

  const b = await req.json().catch(() => ({}))
  const rating = Math.trunc(Number(b.rating))
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: 'rating 1-5 required' }, { status: 400 })
  const comment = typeof b.comment === 'string' && b.comment.trim() ? b.comment.trim().slice(0, 1000) : null

  // Layer 3: record the rater IP for audit (behind the reverse proxy).
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '').trim() || null

  await prisma.issue.update({
    where: { id },
    data: {
      rating, ratingComment: comment, ratedAt: new Date(), raterIp: ip,
      events: { create: [{ type: 'RATED', note: `ให้คะแนน ${rating}/5${comment ? ` — ${comment}` : ''}`, actorName: 'โรงพยาบาล' }] },
    },
  })
  return NextResponse.json({ ok: true })
}
