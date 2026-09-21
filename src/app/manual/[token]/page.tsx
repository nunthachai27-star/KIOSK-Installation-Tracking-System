import { notFound } from 'next/navigation'
import { getManualByToken } from '@/lib/manualServer'
import { BMS_LOGO_DATA_URL } from '@/lib/bmsLogo'

export const dynamic = 'force-dynamic'

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`)

export default async function ManualPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const m = await getManualByToken(token)
  if (!m) notFound()

  return (
    <div className="min-h-screen bg-[#EEF2F7] py-8 px-4">
      <div className="max-w-[900px] mx-auto flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm p-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BMS_LOGO_DATA_URL} alt="BMS" width={48} height={48} className="rounded-md" />
            <div className="flex-1 min-w-0">
              {m.category && <div className="text-[12px] font-semibold text-[#7A44C6] mb-1">{m.category}</div>}
              <h1 className="text-[20px] font-bold text-[#1C2A3E] leading-tight">{m.title}</h1>
              {m.description && <p className="text-[13.5px] text-[#5A6B82] mt-1.5 whitespace-pre-line leading-relaxed">{m.description}</p>}
            </div>
          </div>
          {m.linkUrl && (
            <a href={m.linkUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 bg-[var(--brand)] text-white text-[13.5px] font-semibold rounded-lg px-4 py-2.5 hover:bg-[var(--brand-strong)]">
              🔗 เปิดลิงก์คู่มือ
            </a>
          )}
        </div>

        {m.files.map((f) => {
          const src = `/api/manual-file/${f.id}`
          const isImg = f.fileType.startsWith('image/')
          const isPdf = f.fileType === 'application/pdf'
          return (
            <div key={f.id} className="bg-white rounded-2xl border border-[#E3EAF2] shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#EEF2F8] flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[13px] font-semibold text-[#233047] break-all">📄 {f.fileName} <span className="font-normal text-[#A8A29E]">· {fmtSize(f.fileSize)}</span></div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={src} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)]">↗ เปิด</a>
                  <a href={`${src}?dl=1`} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]">⬇ ดาวน์โหลด</a>
                </div>
              </div>
              {isImg && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={src} alt={f.fileName} className="w-full h-auto" />
              )}
              {isPdf && <iframe src={src} title={f.fileName} className="w-full" style={{ height: '80vh', border: 0 }} />}
            </div>
          )
        })}

        {m.files.length === 0 && !m.linkUrl && (
          <div className="bg-white rounded-2xl border border-dashed border-[#C7D3E2] p-10 text-center text-[#8492A6]">ยังไม่มีไฟล์คู่มือ</div>
        )}
        <div className="text-center text-[11.5px] text-[#A8A29E]">BMS Smart Hospital · คู่มือการใช้งาน</div>
      </div>
    </div>
  )
}
