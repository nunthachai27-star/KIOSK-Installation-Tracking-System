'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV_ITEMS = [
  { href: '/', label: 'งานทั้งหมด', icon: 'jobs' },
  { href: '/planned', label: 'งานตามแผน', icon: 'planned' },
  { href: '/hospitals', label: 'โรงพยาบาล', icon: 'hospital' },
  { href: '/products', label: 'ทะเบียนสินค้า', icon: 'registry' },
  { href: '/calendar', label: 'ปฏิทิน', icon: 'calendar' },
  { href: '/schedule', label: 'จัดคิว', icon: 'queue' },
  { href: '/monitor', label: 'Monitor', icon: 'monitor' },
  { href: '/issues', label: 'แจ้งปัญหา', icon: 'issue' },
  { href: '/stock', label: 'คลังสินค้า', icon: 'stock' },
  { href: '/loans', label: 'ยืม-คืน', icon: 'loan' },
  { href: '/report', label: 'สรุปงาน', icon: 'report' },
  { href: '/settings', label: 'ตั้งค่า', icon: 'settings' },
] as const

// Clean monochrome line icons (recolor via currentColor).
function NavIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'jobs': return <svg {...common}><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h4" /></svg>
    case 'planned': return <svg {...common}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 2.5v3M13 2.5v3M8 12.5l1.8 1.8L13 11" /></svg>
    case 'hospital': return <svg {...common}><path d="M4 17V5.5l6-2.5 6 2.5V17" /><path d="M4 17h12" /><path d="M10 7v4M8 9h4" /></svg>
    case 'registry': return <svg {...common}><rect x="3" y="4" width="14" height="3.5" rx="1" /><path d="M4.5 7.5V16h11V7.5" /><path d="M8 11h4" /></svg>
    case 'calendar': return <svg {...common}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 2.5v3M13 2.5v3" /></svg>
    case 'queue': return <svg {...common}><path d="M8 5.5h9M8 10h9M8 14.5h9" /><path d="M4 5.5h.01M4 10h.01M4 14.5h.01" /></svg>
    case 'monitor': return <svg {...common}><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 17h6M10 13v4" /></svg>
    case 'issue': return <svg {...common}><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4.5M10 14h.01" /></svg>
    case 'stock': return <svg {...common}><path d="M10 3l7 3.8v6.4L10 17l-7-3.8V6.8z" /><path d="M3 6.8l7 3.8 7-3.8M10 10.6V17" /></svg>
    case 'loan': return <svg {...common}><path d="M3 11.5l3-3 3.5 1.5 4-1 3.5 3" /><path d="M6 8.5V5.5h8v3" /><path d="M3 14.5h14" /></svg>
    case 'report': return <svg {...common}><path d="M4 16V9M9 16V5M14 16v-6" /><path d="M3 17h14" /></svg>
    case 'settings': return <svg {...common}><circle cx="10" cy="10" r="2.4" /><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M15.3 4.7l-1.6 1.6M6.3 13.7l-1.6 1.6" /></svg>
    default: return null
  }
}

export function OfficeNav() {
  const path = usePathname()
  return (
    <nav className="flex items-stretch gap-0.5">
      {NAV_ITEMS.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl min-w-[52px] transition-colors ${
              active ? 'bg-[#FFEDE1] text-[#EA580C]' : 'text-[#6B7686] hover:bg-[#F4F7FB] hover:text-[#3C4A5E]'
            }`}
          >
            <NavIcon name={it.icon} />
            <span className="text-[10.5px] font-semibold leading-none whitespace-nowrap">{it.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
