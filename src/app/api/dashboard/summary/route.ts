import { NextResponse } from 'next/server'
import { getSummary } from '@/lib/dashboard'

export async function GET() {
  return NextResponse.json(await getSummary(new Date()))
}
