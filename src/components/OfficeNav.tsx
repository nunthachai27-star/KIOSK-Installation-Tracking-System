'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV_ITEMS = [
  { href: '/', label: 'งานทั้งหมด' },
  { href: '/planned', label: 'งานตามแผน' },
  { href: '/hospitals', label: 'โรงพยาบาล' },
  { href: '/calendar', label: 'ปฏิทิน' },
  { href: '/schedule', label: 'จัดคิว' },
  { href: '/monitor', label: 'Monitor' },
  { href: '/issues', label: 'แจ้งปัญหา' },
  { href: '/spare-parts', label: 'อะไหล่' },
  { href: '/report', label: 'สรุปงาน' },
  { href: '/settings', label: 'ตั้งค่า' },
]

export function OfficeNav() {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${
              active ? 'bg-[#FFEDE1] text-[#EA580C]' : 'text-[#5A6B82] hover:bg-[#F6F9FC]'
            }`}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
