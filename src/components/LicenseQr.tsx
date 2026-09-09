'use client'
import { useEffect, useState } from 'react'

// QR ของ License ต่อเครื่อง — กดเพื่อขยายเต็มจอ ไว้สแกนสะดวก ไม่โดนองค์ประกอบอื่นบัง
export function LicenseQr({ qr, serialNo, licenseKey }: { qr: string; serialNo: string; licenseKey: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!qr) {
    return <div className="w-[140px] h-[140px] grid place-items-center rounded-lg border border-dashed border-[#D6DFEA] text-[11px] text-[#A8A29E]">ยังไม่มี License</div>
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block text-center group" title="กดเพื่อขยาย QR">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR License ${serialNo}`} width={140} height={140}
          className="rounded-lg border border-[#E7EDF4] group-hover:border-[var(--brand)] transition" />
        <div className="text-[11px] text-[var(--brand)] font-semibold mt-1 print:hidden">🔍 กดเพื่อขยาย</div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 print:hidden"
          onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="text-[16px] font-bold text-[#1C1917] tnum">{serialNo || 'QR License'}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR License ${serialNo}`}
              className="rounded-lg border border-[#E7EDF4]"
              style={{ width: 'min(80vw, 70vh, 460px)', height: 'min(80vw, 70vh, 460px)' }} />
            {licenseKey && <div className="font-mono text-[13px] text-[#5A6B82] break-all text-center max-w-[460px] tracking-wide">{licenseKey}</div>}
            <button type="button" onClick={() => setOpen(false)}
              className="mt-1 bg-[var(--brand)] text-white text-[14px] font-semibold rounded-lg px-6 py-2.5 hover:bg-[var(--brand-strong)]">
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  )
}
