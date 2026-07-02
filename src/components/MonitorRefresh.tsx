'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Live clock + periodic data refresh for the wall-monitor board.
export function MonitorRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date())
    setNow(fmt())
    const tick = setInterval(() => setNow(fmt()), 1000)
    const refresh = setInterval(() => router.refresh(), intervalMs)
    return () => { clearInterval(tick); clearInterval(refresh) }
  }, [router, intervalMs])

  return <span className="tnum">{now}</span>
}
