'use client'
import { useEffect, useState } from 'react'

// Toggles browser fullscreen for the wall-monitor board.
export function FullscreenToggle() {
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // fullscreen may be blocked (e.g. iframe without permission) — ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isFull ? 'ออกจากเต็มจอ' : 'ขยายเต็มจอ'}
      className="flex items-center gap-2 px-3 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium"
    >
      <span className="text-base leading-none">{isFull ? '🡖' : '⛶'}</span>
      <span className="hidden sm:inline">{isFull ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</span>
    </button>
  )
}
