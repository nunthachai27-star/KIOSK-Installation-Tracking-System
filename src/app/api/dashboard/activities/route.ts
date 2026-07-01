import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dayRange, getActivitiesBetween } from '@/lib/activities'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const { from: defaultFrom, to: defaultTo } = dayRange(new Date())
  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : defaultTo

  // FIELD users only ever see their own activities; OFFICE sees everyone's.
  const userId = session.user.role === 'FIELD' ? session.user.id : undefined

  const activities = await getActivitiesBetween(from, to, userId)
  return NextResponse.json(activities)
}
