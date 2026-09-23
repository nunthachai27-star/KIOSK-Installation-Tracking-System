// หน้าโหลดดิ้งแบรนด์ BMS — วงแหวนคู่สวนทาง (สีตามธีมผู้ใช้ผ่าน --brand)
// ใช้ร่วมกับ loading.tsx ทุกกลุ่มหน้า (เด้งอัตโนมัติตอนเปลี่ยนหน้า/รอโหลดข้อมูล)
export function BrandLoading({ label = 'กำลังโหลด…' }: { label?: string }) {
  return (
    <div className="min-h-[80vh] w-full grid place-items-center px-6">
      <div className="flex flex-col items-center gap-5">
        <div className="bl-dual" aria-hidden="true"><i></i><i></i></div>
        <div className="text-[14px] font-semibold text-[#5A6B82]">{label}</div>
      </div>
      <style>{`
        .bl-dual{position:relative;width:76px;height:76px}
        .bl-dual i{position:absolute;border-radius:50%;border:4px solid transparent}
        .bl-dual i:nth-child(1){inset:0;border-top-color:var(--brand);border-right-color:var(--brand);animation:bl-spin 1s linear infinite}
        .bl-dual i:nth-child(2){inset:12px;border-bottom-color:var(--brand-strong);border-left-color:var(--brand-strong);animation:bl-spin .8s linear infinite reverse}
        @keyframes bl-spin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.bl-dual i{animation:bl-spin 2.4s linear infinite}}
      `}</style>
    </div>
  )
}
