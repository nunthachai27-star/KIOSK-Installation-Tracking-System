'use client'

// ปุ่มพิมพ์/บันทึกเป็น PDF ของหน้า License (ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์)
export function LicensePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 bg-[var(--brand)] text-white text-[12.5px] font-semibold rounded-lg px-3.5 py-2 hover:bg-[var(--brand-strong)] whitespace-nowrap"
    >
      🖨️ พิมพ์ / บันทึก PDF
    </button>
  )
}
