'use client'
import { useState } from 'react'

// Copies the plain-text daily report (ready to paste into LINE / docs).
export function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})}
      className="border border-[#D6DFEA] text-[#5A6B82] text-[12.5px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[#F4F3F1] whitespace-nowrap">
      {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกรายงาน'}
    </button>
  )
}
