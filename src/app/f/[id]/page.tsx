import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`)
const dFmt = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })

// Public share page for one team file (no login). The link (cuid) is the secret.
export default async function FileSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await prisma.fileAsset.findUnique({
    where: { id },
    select: { name: true, originalName: true, ext: true, size: true, note: true, createdAt: true },
  })
  if (!file) notFound()
  const isApk = file.ext === '.apk'

  return (
    <div className="min-h-screen bg-[#EEF2F7] px-4 py-10 flex justify-center">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-[#EA580C] text-white grid place-items-center text-[18px] font-bold shrink-0">K</span>
          <div>
            <div className="text-[17px] font-bold text-[#1C1917] leading-tight">ดาวน์โหลดไฟล์</div>
            <div className="text-[12.5px] text-[#8492A6]">BMS · ไฟล์ทีม</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="text-[44px] mb-2">{isApk ? '📱' : '📄'}</div>
          <div className="text-[17px] font-bold text-[#1C1917] break-words">{file.name}</div>
          <div className="text-[12.5px] text-[#8492A6] mt-1">
            {file.ext ? file.ext.replace('.', '').toUpperCase() + ' · ' : ''}{fmtSize(file.size)} · อัปเมื่อ {dFmt.format(file.createdAt)}
          </div>
          {file.note && <div className="text-[13px] text-[#5A6B82] mt-3 bg-[#FBFAF8] border border-[#EEEAE6] rounded-lg px-3 py-2 whitespace-pre-line text-left">{file.note}</div>}

          <a href={`/api/download/${id}`} download
            className="mt-5 inline-block w-full bg-[#EA580C] text-white font-semibold rounded-lg px-5 py-3 text-[15px] hover:bg-[#C2410C]">
            ⬇️ ดาวน์โหลด{isApk ? ' APK' : ''}
          </a>
          {isApk && <p className="text-[11.5px] text-[#A8A29E] mt-3">เปิดลิงก์นี้บนมือถือ Android แล้วกดดาวน์โหลด → เปิดไฟล์เพื่อติดตั้ง (อาจต้องอนุญาตติดตั้งจากแหล่งนอก Store)</p>}
        </div>
      </div>
    </div>
  )
}
