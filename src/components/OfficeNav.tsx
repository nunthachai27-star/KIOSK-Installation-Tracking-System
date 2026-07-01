'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'งานทั้งหมด' },
  { href: '/calendar', label: 'ปฏิทิน' },
]

export function OfficeNav() {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${
              active ? 'bg-[#EAF1FF] text-[#2F6BED]' : 'text-[#5A6B82] hover:bg-[#F6F9FC]'
            }`}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
