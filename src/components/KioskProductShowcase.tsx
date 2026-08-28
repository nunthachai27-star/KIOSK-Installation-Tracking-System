'use client'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Product = {
  id: string; name: string; tagline: string | null; category: string | null
  priceLabel: string | null; priceNote: string | null
  features: string[]; specs: string[]; imageId: string | null
}
const imgUrl = (id: string) => `/api/kiosk-products/image/${id}`
const CAT_TONE: Record<string, { bg: string; fg: string }> = {
  'Smart Hospital Kiosk': { bg: '#E4EEFD', fg: '#2563C9' },
  'Mini Kiosk': { bg: '#E1F3E9', fg: '#1F8A54' },
  'Payment Kiosk': { bg: '#FBF0DC', fg: '#B4740E' },
}

export function KioskProductShowcase({ products, admin }: { products: Product[]; admin: boolean }) {
  const [items, setItems] = useState<Product[]>(products)
  const [openId, setOpenId] = useState<string | null>(null)
  const [interestId, setInterestId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [imgv, setImgv] = useState(0) // bump to refresh images after upload
  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 3000) }
  const open = items.find((p) => p.id === openId) || null
  const interest = items.find((p) => p.id === interestId) || null

  return (
    <div className="kpx">
      <style>{CSS}</style>

      <header className="kpx-hero">
        <div className="kpx-hero-in">
          <span className="kpx-eyebrow">Bangkok Medical Software</span>
          <h1>โปรดัก Kiosk สำหรับโรงพยาบาล</h1>
          <p>ตู้บริการอัตโนมัติ ลดคิว ลดภาระเจ้าหน้าที่ เพิ่มความพึงพอใจผู้ป่วย — เลือกดูรุ่นที่ใช่ แล้วกด “สนใจรุ่นนี้” ทีมงานติดต่อกลับ</p>
          <div className="kpx-hero-meta">
            <span>📞 02-4279991 ต่อ 104, 105</span><span>·</span><span>ฝ่ายขายและการตลาด</span>
          </div>
        </div>
      </header>

      <main className="kpx-grid">
        {items.map((p) => {
          const tone = CAT_TONE[p.category ?? ''] ?? { bg: '#EEF1F5', fg: '#5A6B82' }
          return (
            <article className="kpx-card" key={p.id} onClick={() => setOpenId(p.id)}>
              <div className="kpx-thumb">
                {p.imageId
                  ? <img src={`${imgUrl(p.imageId)}?v=${imgv}`} alt={p.name} loading="lazy" />
                  : <div className="kpx-thumb-ph"><span>🖥️</span></div>}
                {p.category && <span className="kpx-cat" style={{ background: tone.bg, color: tone.fg }}>{p.category}</span>}
              </div>
              <div className="kpx-body">
                <h3>{p.name}</h3>
                {p.tagline && <p className="kpx-tag">{p.tagline}</p>}
                <ul className="kpx-feat">
                  {p.features.slice(0, 3).map((f, i) => <li key={i}><span>✓</span>{f}</li>)}
                  {p.features.length > 3 && <li className="more">+ อีก {p.features.length - 3} ความสามารถ</li>}
                </ul>
                <div className="kpx-foot">
                  <div className="kpx-price">{p.priceLabel || 'สอบถามราคา'}</div>
                  <button className="kpx-btn ghost" onClick={(e) => { e.stopPropagation(); setOpenId(p.id) }}>ดูรายละเอียด →</button>
                </div>
              </div>
            </article>
          )
        })}
      </main>

      <footer className="kpx-footer">
        <div>บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด · Bangkok Medical Software Co., Ltd</div>
        <div>ติดต่อฝ่ายขายและการตลาด · โทร 02-4279991 ต่อ 104, 105</div>
      </footer>

      {open && (
        <Detail p={open} admin={admin} imgv={imgv}
          onClose={() => setOpenId(null)}
          onInterest={() => { setInterestId(open.id); setOpenId(null) }}
          onUploaded={(imageId) => { setItems((arr) => arr.map((x) => x.id === open.id ? { ...x, imageId } : x)); setImgv((v) => v + 1); notify('เปลี่ยนรูปแล้ว') }}
          notify={notify} />
      )}
      {interest && <InterestForm p={interest} onClose={() => setInterestId(null)} onDone={(m) => { setInterestId(null); notify(m) }} />}
      {toast && createPortal(<div className="kpx-toast">{toast}</div>, document.body)}
    </div>
  )
}

function Detail({ p, admin, imgv, onClose, onInterest, onUploaded, notify }: {
  p: Product; admin: boolean; imgv: number
  onClose: () => void; onInterest: () => void; onUploaded: (imageId: string) => void; notify: (m: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function upload(f: File | null) {
    if (!f) return
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch(`/api/kiosk-products/${p.id}/image`, { method: 'POST', body: fd })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.imageId) onUploaded(j.imageId); else notify(j.message || 'อัปโหลดไม่สำเร็จ')
    } finally { setBusy(false) }
  }
  return createPortal(
    <div className="kpx-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="kpx-modal" role="dialog" aria-modal="true">
        <button className="kpx-close" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="kpx-modal-media">
          {p.imageId
            ? <img src={`${imgUrl(p.imageId)}?v=${imgv}`} alt={p.name} />
            : <div className="kpx-thumb-ph big"><span>🖥️</span></div>}
          {admin && (
            <>
              <button className="kpx-upload" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'กำลังอัปโหลด…' : '📷 เปลี่ยนรูป'}</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { upload(e.target.files?.[0] || null); e.target.value = '' }} />
            </>
          )}
        </div>
        <div className="kpx-modal-body">
          {p.category && <span className="kpx-cat inline">{p.category}</span>}
          <h2>{p.name}</h2>
          {p.tagline && <p className="kpx-tag">{p.tagline}</p>}
          <div className="kpx-price big">{p.priceLabel || 'สอบถามราคา'}</div>
          {p.priceNote && <div className="kpx-note">{p.priceNote}</div>}

          {p.features.length > 0 && (
            <div className="kpx-sec"><h4>ความสามารถ</h4>
              <ul className="kpx-feat full">{p.features.map((f, i) => <li key={i}><span>✓</span>{f}</li>)}</ul>
            </div>
          )}
          {p.specs.length > 0 && (
            <div className="kpx-sec"><h4>คุณลักษณะ / อุปกรณ์</h4>
              <ul className="kpx-spec">{p.specs.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}

          <button className="kpx-btn primary block" onClick={onInterest}>💙 สนใจรุ่นนี้ — ให้ทีมงานติดต่อกลับ</button>
        </div>
      </div>
    </div>, document.body)
}

function InterestForm({ p, onClose, onDone }: { p: Product; onClose: () => void; onDone: (m: string) => void }) {
  const [hospital, setHospital] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (hospital.trim().length < 2) { setErr('กรุณากรอกชื่อโรงพยาบาล/หน่วยงาน'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/kiosk-products/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, productName: p.name, hospital, contact, phone, email, note, website }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) onDone(j.message || 'ส่งข้อมูลเรียบร้อย ทีมงานจะติดต่อกลับ'); else setErr(j.message || 'ส่งไม่สำเร็จ')
    } finally { setBusy(false) }
  }
  return createPortal(
    <div className="kpx-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="kpx-modal narrow" role="dialog" aria-modal="true">
        <button className="kpx-close" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="kpx-modal-body">
          <span className="kpx-cat inline">สนใจรุ่นนี้</span>
          <h2>{p.name}</h2>
          <p className="kpx-tag">กรอกข้อมูลติดต่อ ทีมขายจะติดต่อกลับโดยเร็ว</p>
          <div className="kpx-form">
            <label>โรงพยาบาล / หน่วยงาน *<input value={hospital} onChange={(e) => setHospital(e.target.value)} maxLength={160} placeholder="เช่น โรงพยาบาล…" /></label>
            <label>ชื่อผู้ติดต่อ<input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} /></label>
            <label>เบอร์โทร<input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></label>
            <label>อีเมล<input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} inputMode="email" /></label>
            <label>หมายเหตุ / คำถามเพิ่มเติม<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} /></label>
            <input className="kpx-hp" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />
            {err && <div className="kpx-err">{err}</div>}
          </div>
          <div className="kpx-actions">
            <button className="kpx-btn ghost" onClick={onClose}>ยกเลิก</button>
            <button className="kpx-btn primary" disabled={busy} onClick={submit}>{busy ? 'กำลังส่ง…' : 'ส่งข้อมูล'}</button>
          </div>
        </div>
      </div>
    </div>, document.body)
}

const CSS = `
.kpx{ --ink:#1B2430; --muted:#6C7889; --line:#E4E9F0; --card:#fff; --bg:#F3F5F9; --brand:#E8892B; --brand-ink:#B96712;
  font-family:"IBM Plex Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); min-height:100vh; }
.kpx *{ box-sizing:border-box; }
.kpx-hero{ background:linear-gradient(135deg,#0E7C86,#1FA6B0); color:#fff; }
.kpx-hero-in{ max-width:1120px; margin:0 auto; padding:40px 20px 44px; }
.kpx-eyebrow{ font-size:12.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; opacity:.9; }
.kpx-hero h1{ font-size:30px; font-weight:700; margin:8px 0 6px; letter-spacing:-.01em; text-wrap:balance; }
.kpx-hero p{ font-size:14.5px; line-height:1.6; max-width:64ch; opacity:.96; margin:0; }
.kpx-hero-meta{ display:flex; gap:8px; flex-wrap:wrap; font-size:13px; margin-top:14px; opacity:.95; }
.kpx-grid{ max-width:1120px; margin:0 auto; padding:26px 20px; display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }
.kpx-card{ background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; cursor:pointer; text-align:left; display:flex; flex-direction:column; box-shadow:0 1px 2px rgba(20,30,45,.04),0 8px 24px -18px rgba(20,30,45,.3); transition:transform .14s,box-shadow .14s,border-color .14s; }
.kpx-card:hover{ transform:translateY(-4px); box-shadow:0 16px 40px -20px rgba(20,30,45,.45); border-color:#D3DAE4; }
.kpx-thumb{ position:relative; aspect-ratio:16/10; background:linear-gradient(135deg,#EAF3F4,#DDE8F2); overflow:hidden; }
.kpx-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.kpx-thumb-ph{ width:100%; height:100%; display:grid; place-items:center; }
.kpx-thumb-ph span{ font-size:52px; opacity:.5; }
.kpx-thumb-ph.big{ aspect-ratio:16/10; }
.kpx-cat{ position:absolute; top:10px; left:10px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; }
.kpx-cat.inline{ position:static; display:inline-block; background:#EEF1F5; color:#5A6B82; margin-bottom:8px; }
.kpx-body{ padding:15px 16px 16px; display:flex; flex-direction:column; gap:8px; flex:1; }
.kpx-body h3{ font-size:16.5px; font-weight:700; margin:0; line-height:1.3; }
.kpx-tag{ font-size:12.5px; color:var(--muted); margin:0; line-height:1.5; }
.kpx-feat{ list-style:none; margin:2px 0 0; padding:0; display:flex; flex-direction:column; gap:4px; }
.kpx-feat li{ font-size:12.5px; color:#3C4A5E; display:flex; gap:7px; line-height:1.45; }
.kpx-feat li span{ color:#1F8A54; font-weight:800; flex-shrink:0; }
.kpx-feat li.more{ color:var(--muted); font-style:italic; }
.kpx-feat.full li{ font-size:13.5px; }
.kpx-foot{ margin-top:auto; padding-top:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.kpx-price{ font-size:17px; font-weight:800; color:var(--brand-ink); }
.kpx-price.big{ font-size:24px; margin-top:6px; }
.kpx-note{ font-size:12px; color:var(--muted); margin-top:3px; }
.kpx-btn{ border:1px solid var(--line); background:#fff; color:var(--ink); font-weight:600; font-size:13px; padding:9px 15px; border-radius:10px; cursor:pointer; font-family:inherit; }
.kpx-btn.ghost:hover{ border-color:var(--brand); color:var(--brand-ink); }
.kpx-btn.primary{ background:var(--brand); border-color:var(--brand); color:#fff; }
.kpx-btn.primary:hover{ filter:brightness(.96); }
.kpx-btn.primary:disabled{ opacity:.55; cursor:default; }
.kpx-btn.block{ width:100%; margin-top:14px; padding:12px; font-size:14.5px; }
.kpx-footer{ max-width:1120px; margin:0 auto; padding:26px 20px 48px; color:var(--muted); font-size:12.5px; line-height:1.7; border-top:1px solid var(--line); }
.kpx-overlay{ position:fixed; inset:0; z-index:80; background:rgba(15,22,33,.55); backdrop-filter:blur(3px); display:flex; align-items:flex-start; justify-content:center; padding:32px 16px; overflow-y:auto; }
.kpx-modal{ position:relative; background:#fff; border-radius:20px; width:100%; max-width:720px; overflow:hidden; box-shadow:0 24px 60px rgba(18,26,40,.35); animation:kpx-pop .18s ease; }
.kpx-modal.narrow{ max-width:460px; }
@keyframes kpx-pop{ from{ transform:translateY(12px) scale(.98); opacity:0; } }
.kpx-close{ position:absolute; top:12px; right:12px; z-index:2; width:34px; height:34px; border:0; border-radius:10px; background:rgba(255,255,255,.9); color:#3C4A5E; font-size:16px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.15); }
.kpx-close:hover{ background:#fff; }
.kpx-modal-media{ position:relative; background:linear-gradient(135deg,#EAF3F4,#DDE8F2); }
.kpx-modal-media img{ width:100%; max-height:320px; object-fit:contain; display:block; }
.kpx-upload{ position:absolute; bottom:12px; left:12px; border:0; background:rgba(15,22,33,.72); color:#fff; font-size:12.5px; font-weight:600; padding:7px 12px; border-radius:9px; cursor:pointer; }
.kpx-modal-body{ padding:20px 22px 24px; }
.kpx-modal-body h2{ font-size:21px; font-weight:700; margin:0 0 4px; letter-spacing:-.01em; }
.kpx-sec{ margin-top:16px; }
.kpx-sec h4{ font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#96A2B5; margin:0 0 8px; }
.kpx-spec{ list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:7px; }
.kpx-spec li{ font-size:12.5px; color:#3C4A5E; background:#F4F7FB; border:1px solid var(--line); padding:5px 10px; border-radius:8px; }
.kpx-form{ display:flex; flex-direction:column; gap:11px; margin-top:14px; }
.kpx-form label{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; font-weight:600; color:#5A6B82; }
.kpx-form input, .kpx-form textarea{ border:1px solid #D6DFEA; border-radius:10px; padding:10px 12px; font-size:14px; font-family:inherit; color:var(--ink); }
.kpx-form input:focus, .kpx-form textarea:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent); }
.kpx-hp{ position:absolute; left:-9999px; width:1px; height:1px; opacity:0; }
.kpx-err{ background:#FBE9E9; border:1px solid #E7B4B4; color:#B0272F; border-radius:10px; padding:9px 12px; font-size:12.5px; }
.kpx-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }
.kpx-toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1B2430; color:#fff; padding:12px 20px; border-radius:12px; font-size:13.5px; font-weight:600; box-shadow:0 12px 40px rgba(0,0,0,.3); z-index:90; max-width:90vw; text-align:center; }
@media (max-width:560px){ .kpx-hero h1{ font-size:24px; } .kpx-grid{ padding:18px 14px; gap:14px; } }
@media (prefers-reduced-motion:reduce){ .kpx-card,.kpx-modal{ transition:none; animation:none; } }
`
