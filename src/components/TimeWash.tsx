'use client'
import { useEffect } from 'react'

// Sets --timewash on <html> from the current hour (used only when bg=time):
// warm in the morning/evening, cool through midday. Refreshes hourly.
export function TimeWash() {
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours()
      const wash = h < 11
        ? 'linear-gradient(180deg, color-mix(in srgb,#F59E0B 12%,transparent), transparent 55%)'
        : h < 16
          ? 'linear-gradient(180deg, color-mix(in srgb,#38BDF8 10%,transparent), transparent 55%)'
          : 'linear-gradient(180deg, color-mix(in srgb,#FB7185 12%,transparent), transparent 55%)'
      document.documentElement.style.setProperty('--timewash', wash)
    }
    apply()
    const id = setInterval(apply, 3600_000)
    return () => clearInterval(id)
  }, [])
  return null
}
