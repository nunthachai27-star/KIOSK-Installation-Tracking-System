'use client'
import { useRouter } from 'next/navigation'
import { downloadNodePng, downloadNodePdf } from '@/lib/exportReport'

export type ShipRowC = {
  hospital: string; province: string; item: string; qty: number
  estCost: number | null; shippedDate: string
  provinceSpan: number; hospitalSpan: number
}

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const baht = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ข้อมูลตั้งต้นตามฟอร์มตัวอย่าง (หัวจดหมาย + ผู้ลงนาม)
const COMPANY = {
  name: 'บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)',
  address: 'เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร',
  phone: 'โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292',
  taxId: 'เลขที่ประจำตัวผู้เสียภาษี 0105548152334',
}
const SIGNERS = [
  { role: 'ผู้จัดทำ', name: 'คุณธนิตา สายวารี' },
  { role: 'ผู้ตรวจสอบ', name: 'คุณภัคธินันท์ วิโรจน์ธานีกุล' },
  { role: 'ผู้รับเอกสาร', name: 'คุณนฤมล แซ่ก๊วย' },
  { role: 'ผู้ตรวจสอบ', name: 'คุณสุมาลี เหรียญไพโรจน์' },
]
// จำนวนแถวว่างสำหรับฟอร์มเปล่า (เดือนที่ยังไม่มีข้อมูล)
const BLANK_ROWS = 15

function beDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`
}

export function ShippingCostReport({
  rows, year, month, method, totalQty, totalEst, hasEst, months,
}: {
  rows: ShipRowC[]; year: number; month: number; method: string
  totalQty: number; totalEst: number; hasEst: boolean
  months: { year: number; month: number }[]
}) {
  const router = useRouter()
  const beYear = year + 543
  const monthTitle = `${TH_MONTHS[month]} ${beYear}`
  const fileBase = `ค่าขนส่ง-${method}-${TH_MONTHS[month]}${beYear}`

  function pick(v: string) {
    const [y, m] = v.split('-').map(Number)
    router.push(`/report/shipping?y=${y}&m=${m}`)
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx')
    const header = ['ลำดับ', 'หน่วยงาน', 'จังหวัด', 'รายการ', 'จำนวน', 'จำนวนรถ', 'ประมาณการค่าขนส่ง', 'ค่าขนส่งจริง', 'วันที่']
    const empty = rows.length === 0
    const aoa: (string | number | null)[][] = []
    type Range = { s: { r: number; c: number }; e: { r: number; c: number } }
    const merges: Range[] = []
    const spanAll = (r: number) => merges.push({ s: { r, c: 0 }, e: { r, c: 8 } })
    // หัวจดหมายบริษัท
    for (const line of [COMPANY.name, COMPANY.address, COMPANY.phone, COMPANY.taxId, `รายการส่งของเดือน ${monthTitle}`, `วิธีจัดส่ง: ${method}`]) {
      spanAll(aoa.length); aoa.push([line])
    }
    aoa.push([]) // เว้นบรรทัด
    aoa.push(header)
    const dataStart = aoa.length
    if (empty) {
      for (let i = 0; i < BLANK_ROWS; i++) aoa.push([i + 1, null, null, null, null, null, null, null, null])
      aoa.push(['', '', '', 'รวม', null, null, null, null, '-'])
    } else {
      rows.forEach((r, i) => {
        aoa.push([
          i + 1,
          r.hospitalSpan > 0 ? r.hospital : null,
          r.provinceSpan > 0 ? r.province : null,
          r.item,
          r.qty,
          null, // จำนวนรถ (กรอกเอง)
          r.estCost ?? null,
          null, // ค่าขนส่งจริง (กรอกเอง)
          r.provinceSpan > 0 ? beDate(r.shippedDate) : null,
        ])
      })
      aoa.push(['', '', '', 'รวม', totalQty, null, hasEst ? totalEst : null, null, '-'])
      // merge แนวตั้ง: จังหวัด(2)/จำนวนรถ(5)/วันที่(8) ตาม provinceSpan ; หน่วยงาน(1) ตาม hospitalSpan
      rows.forEach((r, i) => {
        const R = dataStart + i
        if (r.provinceSpan > 1) for (const c of [2, 5, 8]) merges.push({ s: { r: R, c }, e: { r: R + r.provinceSpan - 1, c } })
        if (r.hospitalSpan > 1) merges.push({ s: { r: R, c: 1 }, e: { r: R + r.hospitalSpan - 1, c: 1 } })
      })
    }
    // ลายเซ็น
    aoa.push([]); aoa.push([])
    aoa.push([SIGNERS[0].role, null, null, SIGNERS[1].role, null, null, SIGNERS[2].role, null, null])
    aoa.push([`(${SIGNERS[0].name})`, null, null, `(${SIGNERS[1].name})`, null, null, `(${SIGNERS[2].name})`, null, null])
    aoa.push([]); aoa.push([null, null, null, SIGNERS[3].role])
    aoa.push([null, null, null, `(${SIGNERS[3].name})`])

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!merges'] = merges as unknown as typeof ws['!merges']
    ws['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 9 }, { wch: 18 }, { wch: 14 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, monthTitle)
    XLSX.writeFile(wb, `${fileBase}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar — ไม่พิมพ์ออกกระดาษ */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select value={`${year}-${month}`} onChange={(e) => pick(e.target.value)}
          className="border border-[#D6DFEA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]">
          {!months.some((m) => m.year === year && m.month === month) && (
            <option value={`${year}-${month}`}>{monthTitle} (ไม่มีข้อมูล)</option>
          )}
          {months.map((m) => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{TH_MONTHS[m.month]} {m.year + 543}</option>
          ))}
        </select>
        <button onClick={downloadExcel}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3F]">⬇ Excel (.xlsx)</button>
        <button onClick={() => window.print()}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">🖨️ พิมพ์</button>
        <button onClick={() => downloadNodePng('ship-report', fileBase)}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">รูป PNG</button>
        <button onClick={() => downloadNodePdf('ship-report', fileBase)}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">PDF</button>
      </div>

      {/* ฟอร์มพิมพ์ */}
      <div id="ship-report" className="bg-white text-[#1C1917] p-6 border border-[#E7EDF4] rounded-xl">
        <div className="mb-3">
          <div className="text-[14px] font-bold">{COMPANY.name}</div>
          <div className="text-[11px] text-[#5A6B82]">{COMPANY.address}</div>
          <div className="text-[11px] text-[#5A6B82]">{COMPANY.phone}</div>
          <div className="text-[11px] text-[#5A6B82]">{COMPANY.taxId}</div>
        </div>
        <div className="text-center mb-3">
          <div className="text-[16px] font-bold">รายการส่งของเดือน {monthTitle}</div>
          <div className="text-[12px] text-[#5A6B82] mt-0.5">วิธีจัดส่ง: {method}</div>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F1F5F9]">
              {['ลำดับ', 'หน่วยงาน', 'จังหวัด', 'รายการ', 'จำนวน', 'จำนวนรถ', 'ประมาณการค่าขนส่ง', 'ค่าขนส่งจริง', 'วันที่'].map((h) => (
                <th key={h} className="border border-[#B9C4D4] px-2 py-1.5 font-bold text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ฟอร์มเปล่า: เดือนที่ยังไม่มีข้อมูล → แถวว่างให้กรอกเอง */}
            {rows.length === 0 && Array.from({ length: BLANK_ROWS }).map((_, i) => (
              <tr key={`b${i}`}>
                <td className="border border-[#B9C4D4] px-2 py-2 text-center">{i + 1}</td>
                {Array.from({ length: 8 }).map((__, c) => <td key={c} className="border border-[#B9C4D4] px-2 py-2"></td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="bg-[#F8FAFD] font-bold">
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center" colSpan={4}>รวม</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center">-</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center">{i + 1}</td>
                {r.hospitalSpan > 0 && (
                  <td className="border border-[#B9C4D4] px-2 py-1.5" rowSpan={r.hospitalSpan}>{r.hospital}</td>
                )}
                {r.provinceSpan > 0 && (
                  <td className="border border-[#B9C4D4] px-2 py-1.5 text-center align-top" rowSpan={r.provinceSpan}>{r.province}</td>
                )}
                <td className="border border-[#B9C4D4] px-2 py-1.5">{r.item}</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center">{r.qty}</td>
                {r.provinceSpan > 0 && (
                  <td className="border border-[#B9C4D4] px-2 py-1.5 text-center align-top" rowSpan={r.provinceSpan}></td>
                )}
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-right">{r.estCost != null ? baht.format(r.estCost) : ''}</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-right"></td>
                {r.provinceSpan > 0 && (
                  <td className="border border-[#B9C4D4] px-2 py-1.5 text-center align-top" rowSpan={r.provinceSpan}>{beDate(r.shippedDate)}</td>
                )}
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-[#F8FAFD] font-bold">
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center" colSpan={4}>รวม</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center">{totalQty}</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-right">{hasEst ? baht.format(totalEst) : ''}</td>
                <td className="border border-[#B9C4D4] px-2 py-1.5"></td>
                <td className="border border-[#B9C4D4] px-2 py-1.5 text-center">-</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ลายเซ็น — ชื่อตามฟอร์มตัวอย่าง */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-10 mt-12 text-[12px] text-center">
          {SIGNERS.slice(0, 3).map((s, i) => (
            <div key={i}>
              <div className="mb-1">..............................................................</div>
              <div>({s.name})</div>
              <div className="text-[#5A6B82]">{s.role}</div>
            </div>
          ))}
          <div></div>
          <div>
            <div className="mb-1">..............................................................</div>
            <div>({SIGNERS[3].name})</div>
            <div className="text-[#5A6B82]">{SIGNERS[3].role}</div>
          </div>
          <div></div>
        </div>
      </div>
    </div>
  )
}
