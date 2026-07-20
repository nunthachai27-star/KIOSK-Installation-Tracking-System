import { getExecDashboard } from '@/lib/exec-dashboard'
import { ISSUE_STATUS } from '@/lib/issue'

export const dynamic = 'force-dynamic'

const nf = new Intl.NumberFormat('th-TH')
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const baht = (n: number) => '฿' + nf.format(Math.round(n))
function bahtShort(n: number): string {
  if (n >= 1_000_000) return '฿' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2) + ' ล้าน'
  return '฿' + nf.format(Math.round(n))
}
const PALETTE = ['#EA580C', '#1B5FD9', '#157F4C', '#9A6B10', '#6D28D9', '#0B7C86', '#B0329A', '#C13540', '#3B45C4', '#B45309']

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120, h = 34
  const max = Math.max(...data), min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.10" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Trend({ pct }: { pct: number }) {
  const up = pct >= 0
  return <span className={`text-[11.5px] font-bold ${up ? 'text-[#157F4C]' : 'text-[#C13540]'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{pct}% <span className="text-[#A8A29E] font-normal">จากเดือนก่อน</span></span>
}

export default async function ExecPage() {
  const d = await getExecDashboard()
  const completionRate = d.dept.totalJobs ? Math.round((d.dept.closedCount / d.dept.totalJobs) * 100) : 0
  const maxProduct = Math.max(1, ...d.products.map((p) => p.sales))
  const maxStep = Math.max(1, ...d.dept.steps.map((s) => s.count))
  const maxCustomer = Math.max(1, ...d.customers.map((c) => c.sales))
  const maxFollow = Math.max(1, ...d.followHospitals.map((h) => h.sales))
  const maxProvince = Math.max(1, ...d.provinces.map((p) => p.sales))
  const methodTotal = Math.max(1, d.service.remote + d.service.onsite + d.service.unspecified)

  // Claims warranty donut
  const wIn = d.claims.inWarranty, wOut = d.claims.outWarranty
  const wUnknown = Math.max(0, d.claims.total - wIn - wOut)
  const wTotal = Math.max(1, d.claims.total)
  const C = 2 * Math.PI * 54
  const segs = [
    { v: wIn, c: '#22A565' }, { v: wOut, c: '#EF5350' }, { v: wUnknown, c: '#CBD2DC' },
  ]
  let acc = 0
  const donutArcs = segs.map((s, i) => {
    const len = (s.v / wTotal) * C
    const el = { key: i, len, off: -acc, color: s.c }
    acc += len
    return el
  })

  const kpis = [
    { icon: '📋', tint: '#1B5FD9', bg: '#E4EEFF', label: 'งานทั้งหมด', value: nf.format(d.dept.totalJobs), sub: `เสร็จสิ้น ${nf.format(d.dept.closedCount)} (${completionRate}%)`, delta: d.dept.trend.jobsPct },
    { icon: '💰', tint: '#157F4C', bg: '#E2F3EA', label: 'มูลค่างานรวม', value: bahtShort(d.dept.totalSales), sub: `จาก ${nf.format(d.dept.totalJobs)} งาน`, delta: d.dept.trend.salesPct },
    { icon: '⏳', tint: '#6D28D9', bg: '#F3EEFF', label: 'งานกำลังดำเนินการ', value: nf.format(d.dept.openJobs), sub: `Pipeline ${nf.format(d.dept.steps.slice(0, 5).reduce((s, x) => s + x.count, 0))} งาน` },
    { icon: '✅', tint: '#157F4C', bg: '#E2F3EA', label: 'เสร็จตรงเวลา', value: nf.format(d.dept.closedCount), sub: `${completionRate}% ของงานทั้งหมด` },
    { icon: '⛔', tint: '#C13540', bg: '#FBE4E4', label: 'เกินกำหนด', value: nf.format(d.dept.overdue), sub: d.dept.overdue > 0 ? 'ต้องเร่งติดตาม' : 'ไม่มีค้าง' },
  ]

  const navItems = [
    { label: 'ภาพรวมผู้บริหาร', href: '#top', active: true }, { label: 'Pipeline', href: '#pipeline' },
    { label: 'งานเร่งด่วน', href: '#urgent' }, { label: 'ยอดขาย / ผลิตภัณฑ์', href: '#products' },
    { label: 'งานแจ้งซ่อม / เคลม', href: '#claims' }, { label: 'ลูกค้า / โรงพยาบาล', href: '#customers' },
    { label: 'แนวโน้ม & ประสิทธิภาพ', href: '#trend' }, { label: 'เครื่องแจ้งซ้ำบ่อย', href: '#repeat' }, { label: 'ผลงานรายบุคคล', href: '#staff' },
  ]

  const bottom = [
    { icon: '✅', tint: '#157F4C', label: 'งานเสร็จตามแผน', value: nf.format(d.dept.closedCount), sub: `${completionRate}% · เป้าหมาย 80%`, spark: d.trend.map((t) => t.jobs), color: '#22A565' },
    { icon: '📈', tint: '#EA580C', label: 'ยอดขายรวม', value: bahtShort(d.dept.totalSales), sub: `เดือนนี้ ${d.dept.trend.salesPct >= 0 ? '+' : ''}${d.dept.trend.salesPct}%`, spark: d.trend.map((t) => t.sales), color: '#EA580C' },
    { icon: '⭐', tint: '#D97706', label: 'ความพึงพอใจลูกค้า', value: d.satisfaction.count > 0 ? `${d.satisfaction.avg.toFixed(1)}` : '—', sub: d.satisfaction.count > 0 ? `จาก ${nf.format(d.satisfaction.count)} รีวิว · เต็ม 5` : 'ยังไม่มีรีวิว', color: '#D97706' },
    { icon: '🚚', tint: '#0B7C86', label: 'อัตราส่งตรงเวลา', value: d.efficiency.onTimeRate != null ? `${d.efficiency.onTimeRate}%` : '—', sub: `${nf.format(d.efficiency.onTimeBase)} งานที่มีข้อมูล`, color: '#0B7C86' },
    { icon: '⏱️', tint: '#9A6B10', label: 'เวลาเฉลี่ย รับงาน→ปิด', value: d.efficiency.avgCycleDays != null ? `${d.efficiency.avgCycleDays}` : '—', sub: 'วัน', color: '#9A6B10' },
    { icon: '⚠️', tint: '#C13540', label: 'งานเกินกำหนด', value: nf.format(d.dept.overdue), sub: d.dept.overdue > 0 ? 'ต้องเร่งติดตาม' : 'ไม่มีค้าง', color: '#C13540' },
  ]

  return (
    <div id="top" className="min-h-screen bg-[#F1F3F6] text-[#1C1917] flex">
      {/* sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-[#ECEFF3] sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#F1F3F6]">
          <span className="w-8 h-8 rounded-lg bg-[#EA580C] text-white grid place-items-center font-bold">K</span>
          <span className="font-bold text-[15px] tracking-tight">KIOSK TRACK</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          <div className="text-[11px] font-semibold text-[#A8A29E] px-3 pt-2 pb-1">เมนูหลัก</div>
          {navItems.map((n) => (
            <a key={n.href} href={n.href}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium ${n.active ? 'bg-[#FFEDE1] text-[#EA580C] font-semibold' : 'text-[#5A6B82] hover:bg-[#F6F7F9]'}`}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="px-5 py-3 text-[11px] text-[#B8B2AC] border-t border-[#F1F3F6]">Executive Dashboard · v1.3</div>
      </aside>

      {/* main */}
      <main className="flex-1 min-w-0">
        {/* header */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#ECEFF3] px-5 sm:px-7 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-[19px] font-bold leading-none truncate">ภาพรวมการทำงานแผนก KIOSK <span className="text-[#8492A6] font-medium">(Executive Dashboard)</span></h1>
            <p className="text-[12px] text-[#8492A6] mt-1">ข้อมูล ณ {dateFmt.format(new Date(d.generatedAt))} น.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-[12.5px] text-[#5A6B82] bg-[#F6F7F9] rounded-lg px-3 py-1.5 border border-[#ECEFF3]">🔄 อัปเดตสด</span>
          </div>
        </header>

        <div className="p-5 sm:p-7 flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-[#ECEFF3] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-9 h-9 rounded-xl grid place-items-center text-[17px]" style={{ background: k.bg }}>{k.icon}</span>
                </div>
                <div className="text-[28px] font-bold tnum leading-none" style={{ color: k.tint }}>{k.value}</div>
                <div className="text-[13px] font-semibold text-[#3C4A5E] mt-1.5">{k.label}</div>
                <div className="text-[11.5px] text-[#A8A29E] mt-0.5">{k.sub}</div>
                {k.delta !== undefined && <div className="mt-1.5"><Trend pct={k.delta} /></div>}
              </div>
            ))}
          </div>

          {/* pipeline + urgent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section id="pipeline" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <h2 className="text-[16px] font-bold mb-4">งานตามขั้นตอน (Pipeline)</h2>
              <div className="grid grid-cols-[26px_1fr_88px_60px] gap-x-3 gap-y-2.5 items-center text-[13px]">
                <div className="contents text-[11.5px] font-semibold text-[#A8A29E]">
                  <div></div><div>ขั้นตอน</div><div>% ของทั้งหมด</div><div className="text-right">จำนวน · เกิน</div>
                </div>
                {d.dept.steps.map((s, i) => (
                  <div key={s.label} className="contents">
                    <span className="w-6 h-6 rounded-md bg-[#F1F3F6] text-[#57534E] grid place-items-center text-[11px] font-bold">{i + 1}</span>
                    <span className="font-medium">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[#F1F3F6] overflow-hidden"><div className="h-full rounded-full bg-[#EA580C]" style={{ width: `${(s.count / maxStep) * 100}%` }} /></div>
                      <span className="text-[11px] text-[#8492A6] w-8 tnum text-right">{s.pct}%</span>
                    </div>
                    <div className="text-right tnum"><span className="font-bold">{nf.format(s.count)}</span>{s.overdue > 0 && <span className="text-[#C13540] font-semibold"> · {s.overdue}</span>}</div>
                  </div>
                ))}
              </div>
            </section>

            <section id="urgent" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <h2 className="text-[16px] font-bold mb-4">งานเร่งด่วน / ต้องติดตาม</h2>
              {d.urgent.length === 0 ? <div className="text-[13px] text-[#8492A6]">ไม่มีงานเกินกำหนด 🎉</div> : (
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-[13px]">
                  {d.urgent.map((u) => (
                    <div key={u.jobCode} className="contents">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{u.hospital}</div>
                        <div className="text-[11.5px] text-[#8492A6]">{u.jobCode} · {u.step}</div>
                      </div>
                      <div className="text-right shrink-0"><span className="text-[12px] font-bold text-[#C13540] bg-[#FBE4E4] rounded-md px-2 py-0.5">เกินกำหนด {u.daysOverdue} วัน</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* products + claims donut + follow hospitals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section id="products" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-[16px] font-bold">ยอดขายตามผลิตภัณฑ์ (Top 5)</h2>
              </div>
              <div className="flex flex-col gap-3.5">
                {d.products.slice(0, 5).map((p, i) => (
                  <div key={p.productType}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-md grid place-items-center text-[11px] font-bold text-white shrink-0" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                      <span className="text-[13px] font-semibold truncate flex-1">{p.productType}</span>
                      <span className="text-[12.5px] tnum font-bold shrink-0">{baht(p.sales)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F3F6] overflow-hidden ml-7">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, (p.sales / maxProduct) * 100)}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <div className="text-[11px] text-[#A8A29E] ml-7 mt-0.5">{nf.format(p.count)} งาน · {Math.round((p.sales / d.dept.totalSales) * 100)}%</div>
                  </div>
                ))}
              </div>
            </section>

            <section id="claims" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <h2 className="text-[16px] font-bold mb-3">งานแจ้งซ่อม / เคลม <span className="text-[#8492A6] font-medium text-[13px]">(รวม {nf.format(d.claims.total)} รายการ)</span></h2>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#F1F3F6" strokeWidth="14" />
                    {donutArcs.map((a) => (
                      <circle key={a.key} cx="60" cy="60" r="54" fill="none" stroke={a.color} strokeWidth="14"
                        strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={a.off} strokeLinecap="butt" />
                    ))}
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div><div className="text-[22px] font-bold text-[#157F4C] tnum leading-none">{nf.format(wIn)}</div><div className="text-[10px] text-[#8492A6]">ในประกัน</div></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[12.5px]">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#22A565]" /> อยู่ในประกัน <b className="tnum">{nf.format(wIn)}</b> <span className="text-[#8492A6]">({Math.round((wIn / wTotal) * 100)}%)</span></div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF5350]" /> หมดประกัน <b className="tnum">{nf.format(wOut)}</b> <span className="text-[#8492A6]">({Math.round((wOut / wTotal) * 100)}%)</span></div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#CBD2DC]" /> ไม่ระบุ <b className="tnum">{nf.format(wUnknown)}</b> <span className="text-[#8492A6]">({Math.round((wUnknown / wTotal) * 100)}%)</span></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {d.claims.byStatus.map((c) => (
                  <span key={c.status} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: ISSUE_STATUS[c.status].bg, color: ISSUE_STATUS[c.status].color }}>
                    {ISSUE_STATUS[c.status].label} {nf.format(c.count)}
                  </span>
                ))}
              </div>
            </section>

            <section id="customers" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <h2 className="text-[16px] font-bold mb-4">โรงพยาบาลที่ต้องติดตาม</h2>
              {d.followHospitals.length === 0 ? <div className="text-[13px] text-[#8492A6]">ไม่มีงานเกินกำหนด</div> : (
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2.5 text-[13px] items-center">
                  <div className="contents text-[11px] font-semibold text-[#A8A29E]"><div>โรงพยาบาล</div><div className="text-right">เกิน</div><div className="text-right">มูลค่า</div></div>
                  {d.followHospitals.map((h) => (
                    <div key={h.name} className="contents">
                      <span className="font-medium truncate">{h.name}</span>
                      <span className="text-right text-[#C13540] font-bold tnum">{h.overdue}</span>
                      <span className="text-right tnum text-[#5A6B82]">{baht(h.sales)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* bottom stat cards */}
          <div id="trend" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {bottom.map((b) => (
              <div key={b.label} className="bg-white rounded-2xl border border-[#ECEFF3] p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-7 h-7 rounded-lg grid place-items-center text-[14px]" style={{ background: `${b.color}1A` }}>{b.icon}</span>
                </div>
                <div className="text-[22px] font-bold tnum leading-none" style={{ color: b.color }}>{b.value}</div>
                <div className="text-[12px] font-semibold text-[#3C4A5E] mt-1 leading-tight">{b.label}</div>
                <div className="text-[11px] text-[#A8A29E] mt-0.5">{b.sub}</div>
                {b.spark && <div className="mt-2"><Sparkline data={b.spark} color={b.color} /></div>}
              </div>
            ))}
          </div>

          {/* provinces + inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-[16px] font-bold">ความครอบคลุมตามจังหวัด</h2>
                <span className="text-[12.5px] text-[#8492A6]">{nf.format(d.provinceCount)} จังหวัด</span>
              </div>
              <div className="flex flex-col gap-3">
                {d.provinces.map((p) => (
                  <div key={p.province}>
                    <div className="flex items-baseline justify-between mb-1"><span className="text-[13px] font-semibold">{p.province} <span className="text-[#A8A29E] font-normal">· {nf.format(p.jobs)} งาน</span></span><span className="text-[12.5px] tnum font-bold">{baht(p.sales)}</span></div>
                    <div className="h-2 rounded-full bg-[#F1F3F6] overflow-hidden"><div className="h-full rounded-full bg-[#1B5FD9]" style={{ width: `${Math.max(3, (p.sales / maxProvince) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-5">
              <div className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
                <h2 className="text-[16px] font-bold mb-3">มูลค่าสินทรัพย์คงคลัง (อะไหล่)</h2>
                <div className="flex items-end gap-4">
                  <div><div className="text-[28px] font-bold text-[#157F4C] tnum leading-none">{bahtShort(d.inventory.stockValue)}</div><div className="text-[12px] text-[#8492A6] mt-1">{baht(d.inventory.stockValue)}</div></div>
                  <div className="ml-auto text-right"><div className="text-[13px] text-[#5A6B82]">{nf.format(d.inventory.kinds)} รายการ</div>{d.inventory.lowStock > 0 && <div className="text-[13px] font-semibold text-[#C13540]">สต็อกหมด {nf.format(d.inventory.lowStock)}</div>}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
                <h2 className="text-[16px] font-bold mb-4">Top โรงพยาบาลตามยอดขาย</h2>
                <div className="flex flex-col gap-2.5">
                  {d.customers.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-[12px] w-5 shrink-0 tnum text-[#A8A29E]">{i + 1}</span>
                      <span className="text-[12.5px] font-semibold flex-1 truncate">{c.name}</span>
                      <div className="w-20 h-2 rounded-full bg-[#F1F3F6] overflow-hidden shrink-0"><div className="h-full rounded-full bg-[#EA580C]" style={{ width: `${(c.sales / maxCustomer) * 100}%` }} /></div>
                      <span className="text-[12px] tnum font-bold w-20 text-right shrink-0">{baht(c.sales)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* repeat-failure equipment (recurring faults) */}
          <section id="repeat" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-[16px] font-bold">🔁 เครื่องที่แจ้งซ้ำบ่อย</h2>
              <span className="text-[12.5px] text-[#8492A6]">
                {d.repeatFailures.totalUnits > 0
                  ? `${nf.format(d.repeatFailures.totalUnits)} เครื่องแจ้งซ้ำ · รวม ${nf.format(d.repeatFailures.totalReports)} ครั้ง`
                  : 'ไม่มีเครื่องที่แจ้งซ้ำ'}
              </span>
            </div>
            {d.repeatFailures.units.length === 0 ? (
              <div className="text-[13px] text-[#8492A6]">ยังไม่มีอุปกรณ์ที่ถูกแจ้งปัญหาซ้ำ — เป็นสัญญาณที่ดี</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[520px]">
                  <thead>
                    <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
                      <th className="pb-2 font-semibold">S/N เครื่อง</th>
                      <th className="pb-2 font-semibold">ผลิตภัณฑ์</th>
                      <th className="pb-2 font-semibold">โรงพยาบาล</th>
                      <th className="pb-2 font-semibold text-right pr-2">จำนวนครั้ง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.repeatFailures.units.map((u) => (
                      <tr key={u.serialNo} className="border-b border-[#F7F8FA] last:border-0">
                        <td className="py-2.5 font-bold tnum text-[#1C1917]">{u.serialNo}</td>
                        <td className="py-2.5 text-[#3C4A5E]">{u.productType}</td>
                        <td className="py-2.5 text-[#5A6B82] truncate max-w-[220px]">{u.hospital}</td>
                        <td className="py-2.5 text-right pr-2">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-[12.5px] font-bold tnum bg-[#FBE4E4] text-[#C13540]">{u.count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* per-staff performance + satisfaction */}
          <section id="staff" className="bg-white rounded-2xl border border-[#ECEFF3] p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-[16px] font-bold">ผลการทำงานรายบุคคล</h2>
              <span className="text-[12.5px] text-[#8492A6]">คะแนนความพึงพอใจนับจากงานที่รับผิดชอบแก้ไข</span>
            </div>
            {d.staff.length === 0 ? <div className="text-[13px] text-[#8492A6]">ยังไม่มีข้อมูล</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[560px]">
                  <thead>
                    <tr className="text-[11px] font-semibold text-[#A8A29E] text-left border-b border-[#F1F3F6]">
                      <th className="pb-2 font-semibold">เจ้าหน้าที่</th>
                      <th className="pb-2 font-semibold text-right">งานรวม</th>
                      <th className="pb-2 font-semibold text-right">แจ้งซ่อม/เคลม</th>
                      <th className="pb-2 font-semibold text-right pr-2">ความพึงพอใจ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.staff.map((s) => (
                      <tr key={s.id} className="border-b border-[#F7F8FA] last:border-0">
                        <td className="py-2.5 font-semibold text-[#1C1917]">{s.name}</td>
                        <td className="py-2.5 text-right tnum text-[#3C4A5E]">{nf.format(s.total)}</td>
                        <td className="py-2.5 text-right tnum text-[#3C4A5E]">{nf.format(s.issues)}</td>
                        <td className="py-2.5 text-right pr-2">
                          {s.ratingCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <span className="text-[13px] leading-none tracking-tight text-[#D97706]">
                                {'★'.repeat(Math.round(s.rating))}<span className="text-[#E7E1D5]">{'★'.repeat(5 - Math.round(s.rating))}</span>
                              </span>
                              <span className="tnum font-bold text-[#B45309]">{s.rating.toFixed(1)}</span>
                              <span className="text-[11px] text-[#A8A29E]">({s.ratingCount})</span>
                            </span>
                          ) : <span className="text-[12px] text-[#C7CDD6]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* how the numbers are calculated */}
          <details className="bg-white rounded-2xl border border-[#ECEFF3] p-5 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
              <span className="text-[15px] font-bold">ℹ️ วิธีการคิดของ Dashboard</span>
              <span className="text-[12.5px] text-[#8492A6] group-open:hidden">แตะเพื่อดูรายละเอียด ▾</span>
              <span className="text-[12.5px] text-[#8492A6] hidden group-open:inline">ซ่อน ▴</span>
            </summary>
            <div className="mt-4 pt-4 border-t border-[#F1F3F6] grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[13px] leading-relaxed text-[#3C4A5E]">
              <ul className="flex flex-col gap-1.5">
                <li><b>งานทั้งหมด/ยอดขาย</b> — เฉพาะงานเซ็นสัญญา · ยอดขาย = ผลรวมมูลค่างาน · %เทียบเดือนก่อน (ตามวันเริ่มสัญญา)</li>
                <li><b>Pipeline</b> — จัดกลุ่มงานตามสถานะเข้า 6 ขั้นตอน · คอลัมน์ท้าย = จำนวน · จำนวนงานเกินกำหนดในขั้นนั้น (สีแดง)</li>
                <li><b>งานเร่งด่วน / รพ.ที่ต้องติดตาม</b> — งานที่เลยวันกำหนดส่งมอบและยังไม่ปิด/ยกเลิก</li>
                <li><b>เคลม (โดนัท)</b> — สัดส่วนในประกัน/หมดประกัน/ไม่ระบุ (ประกัน = วันเปิดบิล +1 ปี)</li>
              </ul>
              <ul className="flex flex-col gap-1.5">
                <li><b>Remote %</b> — สัดส่วนเคลมที่แก้ไขระยะไกล (ยิ่งสูงยิ่งประหยัดต้นทุน)</li>
                <li><b>ส่งตรงเวลา</b> — วันขนออก ≤ วันกำหนดส่ง · <b>เวลาเฉลี่ยรับงาน→ปิด</b> จากวันที่ในระบบ</li>
                <li><b>มูลค่าคงคลัง</b> = ราคาขาย × จำนวนคงเหลือ ของอะไหล่ทุกรายการ</li>
                <li><b>จังหวัด/Top ลูกค้า</b> — ยอดขายแยกตามจังหวัด/โรงพยาบาล</li>
                <li><b>เครื่องแจ้งซ้ำบ่อย</b> — นับตาม S/N ที่มีการแจ้งปัญหา/เคลม ≥ 2 ครั้ง · สะท้อนอุปกรณ์ที่เสียซ้ำ ควรพิจารณาเปลี่ยนแทนซ่อม</li>
                <li><b>ผลงานรายบุคคล</b> — งานรวมทุกขั้นตอน · ⭐ ความพึงพอใจนับจากงานที่รับผิดชอบแก้ไข</li>
                <li className="text-[#A8A29E]">ข้อมูลสดทุกครั้งที่รีเฟรช · แสดงเฉพาะตัวเลขภาพรวมเพื่อการนำเสนอ</li>
              </ul>
            </div>
          </details>

          <div className="text-center text-[12px] text-[#B8B2AC] pb-2">ระบบบันทึกและติดตามงานติดตั้ง KIOSK · BMS</div>
        </div>
      </main>
    </div>
  )
}
