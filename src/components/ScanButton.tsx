'use client'
import { useState, useRef, useEffect } from 'react'

// Camera barcode / QR scanner (mobile). Uses the native BarcodeDetector API
// (supported on Android Chrome). Falls back to a message when unavailable.
export function ScanButton({ onScan, className }: { onScan: (text: string) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="สแกนบาร์โค้ด / QR"
        className={className ?? 'w-8 h-8 shrink-0 grid place-items-center rounded-lg border border-[#D6DFEA] text-[#5A6B82] hover:bg-[#F4F3F1]'}>
        📷
      </button>
      {open && <ScannerModal onClose={() => setOpen(false)} onScan={(t) => { onScan(t); setOpen(false) }} />}
    </>
  )
}

function ScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (globalThis as any).BarcodeDetector

    async function start() {
      if (!BD) { setErr('อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับการสแกน — แนะนำ Chrome บนมือถือ Android (หรือพิมพ์เลขเอง)'); return }
      let detector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
      try { detector = new BD() } catch { setErr('เริ่มการสแกนไม่สำเร็จ'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      } catch { setErr('เปิดกล้องไม่ได้ — โปรดอนุญาตการใช้งานกล้อง'); return }
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      await v.play().catch(() => {})
      const tick = async () => {
        if (stopped) return
        try {
          const codes = await detector.detect(v)
          const val = codes?.[0]?.rawValue?.trim()
          if (val) { onScan(val); return }
        } catch { /* frame not ready */ }
        timer = setTimeout(tick, 180)
      }
      timer = setTimeout(tick, 300)
    }
    start()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/85 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#111] rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <span className="text-[14px] font-semibold">📷 สแกนบาร์โค้ด / QR</span>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10 text-white">✕</button>
        </div>
        <div className="relative aspect-square bg-black">
          {err ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-[#E7E1D5]">{err}</div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="w-2/3 h-1/3 border-2 border-[#EA580C] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-3 text-center text-[12px] text-[#B8B2AC]">
          {err ? 'ปิดหน้าต่างแล้วพิมพ์เลขเอง' : 'เล็งกล้องไปที่บาร์โค้ด/QR ของอุปกรณ์ — ระบบจะเติมเลขให้อัตโนมัติ'}
        </div>
      </div>
    </div>
  )
}
