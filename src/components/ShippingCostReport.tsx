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
    const aoa: (string | number | null)[][] = []
    aoa.push(['บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)'])
    aoa.push([`รายการส่งของเดือน ${monthTitle}`])
    aoa.push([`วิธีจัดส่ง: ${method}`])
    const headerRowIdx = aoa.length
    aoa.push(header)
    const dataStart = aoa.length
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
    const totalRowIdx = aoa.length
    aoa.push(['', '', '', 'รวม', totalQty, null, hasEst ? totalEst : null, null, '-'])

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // merge: หัวเรื่อง 3 แถวแรก (A..I)
    type Range = { s: { r: number; c: number }; e: { r: number; c: number } }
    const merges: Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ]
    // merge แนวตั้ง: จังหวัด(2)/จำนวนรถ(5)/วันที่(8) ตาม provinceSpan ; หน่วยงาน(1) ตาม hospitalSpan
    rows.forEach((r, i) => {
      const R = dataStart + i
      if (r.provinceSpan > 1) {
        for (const c of [2, 5, 8]) merges.push({ s: { r: R, c }, e: { r: R + r.provinceSpan - 1, c } })
      }
      if (r.hospitalSpan > 1) merges.push({ s: { r: R, c: 1 }, e: { r: R + r.hospitalSpan - 1, c: 1 } })
    })
    ws['!merges'] = merges as unknown as typeof ws['!merges']
    ws['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 9 }, { wch: 18 }, { wch: 14 }, { wch: 12 }]
    void headerRowIdx; void totalRowIdx
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
        <div className="text-center mb-3">
          <div className="text-[15px] font-bold">บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)</div>
          <div className="text-[16px] font-bold mt-1">รายการส่งของเดือน {monthTitle}</div>
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
            {rows.length === 0 && (
              <tr><td colSpan={9} className="border border-[#B9C4D4] px-2 py-6 text-center text-[#8492A6]">ไม่มีรายการจัดส่งด้วยวิธีนี้ในเดือนที่เลือก</td></tr>
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

        {/* ลายเซ็น */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 mt-10 text-[12px] text-center">
          <div><div className="border-b border-dotted border-[#8492A6] mb-1"></div>ผู้จัดทำ</div>
          <div><div className="border-b border-dotted border-[#8492A6] mb-1"></div>ผู้ตรวจสอบ</div>
          <div><div className="border-b border-dotted border-[#8492A6] mb-1"></div>ผู้รับเอกสาร</div>
          <div><div className="border-b border-dotted border-[#8492A6] mb-1"></div>ผู้ตรวจสอบ</div>
        </div>
      </div>
    </div>
  )
}
