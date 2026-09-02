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
  { href: '/purchases', label: 'งานจัดซื้อ', icon: 'purchase' },
  { href: '/stock', label: 'คลังสินค้า', icon: 'stock' },
  { href: '/loans', label: 'ยืม-คืน', icon: 'loan' },
  { href: '/notes', label: 'โน้ต', icon: 'note' },
  { href: '/forms', label: 'แบบฟอร์ม', icon: 'form' },
  { href: '/dev', label: 'พัฒนา', icon: 'dev' },
  // สรุปงาน (/report) และ ตั้งค่า (/settings) ย้ายไปอยู่ในเมนูผู้ใช้แล้ว
] as const

// Clean monochrome line icons (recolor via currentColor).
function NavIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: `ni ni-${name}` }
  switch (name) {
    case 'dashboard': return <svg {...common}><rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" /><rect x="11" y="3.5" width="5.5" height="5.5" rx="1" /><rect x="3.5" y="11" width="5.5" height="5.5" rx="1" /><rect x="11" y="11" width="5.5" height="5.5" rx="1" /></svg>
    case 'jobs': return <svg {...common}><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h4" /></svg>
    case 'planned': return <svg {...common}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 2.5v3M13 2.5v3M8 12.5l1.8 1.8L13 11" /></svg>
    case 'hospital': return <svg {...common}><path d="M4 17V5.5l6-2.5 6 2.5V17" /><path d="M4 17h12" /><path d="M10 7v4M8 9h4" /></svg>
    case 'registry': return <svg {...common}><rect x="3" y="4" width="14" height="3.5" rx="1" /><path d="M4.5 7.5V16h11V7.5" /><path d="M8 11h4" /></svg>
    case 'calendar': return <svg {...common}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 2.5v3M13 2.5v3" /></svg>
    case 'queue': return <svg {...common}><path d="M8 5.5h9M8 10h9M8 14.5h9" /><path d="M4 5.5h.01M4 10h.01M4 14.5h.01" /></svg>
    case 'monitor': return <svg {...common}><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 17h6M10 13v4" /></svg>
    case 'issue': return <svg {...common}><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4.5M10 14h.01" /></svg>
    case 'purchase': return <svg {...common}><path d="M3 4h2l1.2 9.5a1 1 0 0 0 1 .9h6.9a1 1 0 0 0 1-.8L17 7H6" /><circle cx="8.5" cy="17" r="1" /><circle cx="14.5" cy="17" r="1" /></svg>
    case 'stock': return <svg {...common}><path d="M10 3l7 3.8v6.4L10 17l-7-3.8V6.8z" /><path d="M3 6.8l7 3.8 7-3.8M10 10.6V17" /></svg>
    case 'loan': return <svg {...common}><path d="M3 11.5l3-3 3.5 1.5 4-1 3.5 3" /><path d="M6 8.5V5.5h8v3" /><path d="M3 14.5h14" /></svg>
    case 'note': return <svg {...common}><path d="M5 3h10a1 1 0 0 1 1 1v9l-4 4H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M7 7h6M7 10h4M11.5 17v-3.5a1 1 0 0 1 1-1H16" /></svg>
    case 'dev': return <svg {...common}><path d="M8 5.5 3.5 10 8 14.5M12 5.5 16.5 10 12 14.5" /></svg>
    case 'form': return <svg {...common}><path d="M5 2.5h6l3.5 3.5V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" /><path d="M11 2.5V6h3.5" /><path d="M6.5 10h4.5M6.5 12.7h3" /><path d="m13.4 11.2 1.6 1.6-3 3-1.7.2.2-1.7z" /></svg>

    case 'report': return <svg {...common}><path d="M4 16V9M9 16V5M14 16v-6" /><path d="M3 17h14" /></svg>
    case 'settings': return <svg {...common}><circle cx="10" cy="10" r="2.4" /><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M15.3 4.7l-1.6 1.6M6.3 13.7l-1.6 1.6" /></svg>
    default: return null
  }
}

export function OfficeNav() {
  const path = usePathname()
  return (
    <nav className="flex items-stretch gap-0.5">
      <style>{NAV_ANIM}</style>
      {NAV_ITEMS.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`nav-link flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl min-w-[52px] transition-colors ${
              active ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[#6B7686] hover:bg-[#F4F7FB] hover:text-[#3C4A5E]'
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

// ลูกเล่นไอคอนตอน hover — แต่ละแถบมีเอกลักษณ์คนละแบบ (เคารพ prefers-reduced-motion)
const NAV_ANIM = `
.ni{ transform-box:fill-box; transform-origin:center; }
.nav-link{ overflow:visible; }
@media(prefers-reduced-motion:no-preference){
  /* แดชบอร์ด — ป็อปสเกล */
  .nav-link:hover .ni-dashboard{ animation:na-pop .5s ease; }
  @keyframes na-pop{ 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
  /* งานทั้งหมด — สะบัดเอียง */
  .nav-link:hover .ni-jobs{ animation:na-wiggle .55s ease; }
  @keyframes na-wiggle{ 0%,100%{transform:rotate(0)} 25%{transform:rotate(-9deg)} 55%{transform:rotate(7deg)} 80%{transform:rotate(-3deg)} }
  /* งานตามแผน — เด้งขึ้น */
  .nav-link:hover .ni-planned{ animation:na-bounce .55s cubic-bezier(.28,.84,.42,1); }
  @keyframes na-bounce{ 0%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} 70%{transform:translateY(-1px)} }
  /* โรงพยาบาล — ลอยขึ้นลง */
  .nav-link:hover .ni-hospital{ animation:na-bob .8s ease-in-out; }
  @keyframes na-bob{ 0%,100%{transform:translateY(0)} 25%{transform:translateY(-2.5px)} 50%{transform:translateY(0)} 75%{transform:translateY(-1.5px)} }
  /* ทะเบียนสินค้า — พลิกแนวนอน */
  .nav-link:hover .ni-registry{ animation:na-flipx .6s ease; }
  @keyframes na-flipx{ 0%{transform:scaleX(1)} 50%{transform:scaleX(-1)} 100%{transform:scaleX(1)} }
  /* ปฏิทิน — แกว่งจากบน */
  .nav-link:hover .ni-calendar{ transform-origin:top center; animation:na-swing .6s ease; }
  @keyframes na-swing{ 0%,100%{transform:rotate(0)} 30%{transform:rotate(11deg)} 65%{transform:rotate(-8deg)} }
  /* จัดคิว — ไล่ทีละบรรทัด */
  .nav-link:hover .ni-queue{ animation:na-nudge .5s ease; }
  @keyframes na-nudge{ 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
  /* Monitor — กะพริบ */
  .nav-link:hover .ni-monitor{ animation:na-blink .7s ease; }
  @keyframes na-blink{ 0%,100%{opacity:1;transform:scale(1)} 40%{opacity:.35;transform:scale(1.08)} 70%{opacity:1} }
  /* แจ้งปัญหา — สั่น */
  .nav-link:hover .ni-issue{ animation:na-shake .5s ease; }
  @keyframes na-shake{ 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 60%{transform:translateX(-1.5px)} 80%{transform:translateX(1.5px)} }
  /* งานจัดซื้อ — รถเข็นวิ่ง */
  .nav-link:hover .ni-purchase{ animation:na-roll .6s ease; }
  @keyframes na-roll{ 0%{transform:translateX(-3px)} 60%{transform:translateX(3px)} 100%{transform:translateX(0)} }
  /* คลังสินค้า — หมุนกล่อง */
  .nav-link:hover .ni-stock{ animation:na-spin .7s ease; }
  @keyframes na-spin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }
  /* ยืม-คืน — สลับไปมา */
  .nav-link:hover .ni-loan{ animation:na-swap .6s ease; }
  @keyframes na-swap{ 0%,100%{transform:translateX(0)} 30%{transform:translateX(-2.5px)} 65%{transform:translateX(2.5px)} }
  /* โน้ต — เอียงแบบเขียน */
  .nav-link:hover .ni-note{ transform-origin:bottom left; animation:na-tilt .55s ease; }
  @keyframes na-tilt{ 0%,100%{transform:rotate(0)} 40%{transform:rotate(-12deg)} 70%{transform:rotate(4deg)} }
  /* พัฒนา — วงเล็บถ่าง */
  .nav-link:hover .ni-dev{ animation:na-spread .55s ease; }
  @keyframes na-spread{ 0%{transform:scaleX(1)} 45%{transform:scaleX(1.28)} 100%{transform:scaleX(1)} }
  /* แบบฟอร์ม — ปั๊มตรา */
  .nav-link:hover .ni-form{ animation:na-stamp .55s cubic-bezier(.3,.9,.4,1); }
  @keyframes na-stamp{ 0%{transform:scale(1) rotate(0)} 40%{transform:scale(.82) rotate(-6deg)} 70%{transform:scale(1.08) rotate(2deg)} 100%{transform:scale(1) rotate(0)} }
}`
