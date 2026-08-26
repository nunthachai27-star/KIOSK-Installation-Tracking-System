'use client'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  DEV_STATUSES, DEV_TYPES, DEV_PRIORITIES,
  STATUS_META, TYPE_META, PRIORITY_META, devCode,
  type DevStatus, type DevType, type DevPriority,
} from '@/lib/devRequest'

// ── ชนิดข้อมูลฝั่งหน้าเว็บ ────────────────────────────────────────────────────
export type DevImg = { id: string; type: string }
export type DevEvent = {
  id: string; actor: string; actorName: string | null
  fromStatus: string | null; toStatus: string | null; note: string | null; createdAt: string
}
export type DevReq = {
  id: string; code: number; type: string; priority: string; status: string
  product: string; title: string; detail: string
  steps: string | null; expected: string | null; links: string | null
  reporterName: string | null; createdAt: string; updatedAt: string
  events: DevEvent[]; images?: DevImg[]
}

// ── จานสีเฉพาะบอร์ด (light — เข้ากับหน้าออฟฟิศ) ───────────────────────────────
const SCLR: Record<string, string> = { new: '#8A94A6', review: '#B4740E', progress: '#2563C9', test: '#7A44C6', done: '#1F8A54' }
const SBG: Record<string, string> = { new: '#EEF1F5', review: '#FBF0DC', progress: '#E4EEFD', test: '#F0E8FB', done: '#E1F3E9' }
const TCLR: Record<string, string> = { bug: '#C0392B', feat: '#2E7D32', ui: '#7A44C6', imp: '#2563C9' }
const PCLR: Record<string, string> = { high: '#D63B3B', mid: '#C98A16', low: '#7A879B' }

function stTone(s: string) { return STATUS_META[s as DevStatus]?.tone ?? 'new' }
function tyTone(t: string) { return TYPE_META[t as DevType]?.tone ?? 'bug' }
function prTone(p: string) { return PRIORITY_META[p as DevPriority]?.tone ?? 'mid' }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'เมื่อครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} วันก่อน`
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function initials(name: string | null): string { return (name || '?').trim().slice(0, 2) }

type Props = { initial: DevReq[]; mode: 'staff' | 'dev'; token?: string; teamNote?: string | null; publicBase?: string }

// กล่องยืนยันแบบเว็บ (แทน confirm() ของเบราว์เซอร์)
type ConfirmOpts = { title: string; message?: string; confirmText?: string; danger?: boolean }

export function DevBoard({ initial, mode, token, teamNote: teamNoteInit, publicBase }: Props) {
  const [rows, setRows] = useState<DevReq[]>(initial)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | DevType>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [teamNote, setTeamNote] = useState<string | null>(teamNoteInit ?? null)
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)

  const isDev = mode === 'dev'
  const notify = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2800) }, [])
  const base = publicBase || (typeof window !== 'undefined' ? window.location.origin : '')

  // เปิดคำขอตาม ?req= (ลิงก์รายหัวข้อที่ส่งให้ทีมพัฒนา)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('req')
    if (p) setOpenId(p)
  }, [])

  function askConfirm(opts: ConfirmOpts): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }))
  }

  const refresh = useCallback(async () => {
    const url = isDev ? `/api/dev/team/${token}` : '/api/dev-requests'
    const r = await fetch(url, { cache: 'no-store' })
    if (r.ok) { const j = await r.json(); setRows(j.requests); if ('teamNote' in j) setTeamNote(j.teamNote) }
  }, [isDev, token])

  const imgUrl = useCallback((img: DevImg) =>
    isDev ? `/api/dev/team/${token}/image/${img.id}` : `/api/dev-requests/image/${img.id}`,
    [isDev, token])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false
      if (!needle) return true
      return (r.title + ' ' + r.product + ' ' + (r.reporterName || '') + ' ' + devCode(r.code)).toLowerCase().includes(needle)
    })
  }, [rows, q, typeFilter])

  const open = rows.find((r) => r.id === openId) || null

  // ── การกระทำ ───────────────────────────────────────────────────────────────
  async function changeStatus(id: string, status: string, note?: string, devName?: string) {
    setBusy(true)
    try {
      const url = isDev ? `/api/dev/team/${token}/${id}` : `/api/dev-requests/${id}`
      const r = await fetch(url, {
        method: isDev ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDev ? { status, note, devName, website: '' } : { status, note }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setRows((p) => p.map((x) => x.id === id ? j.request : x)); notify('อัปเดตแล้ว') }
      else notify(j.message || 'อัปเดตไม่สำเร็จ')
    } finally { setBusy(false) }
  }
  async function addComment(id: string, note: string, devName?: string) {
    if (!note.trim()) return
    await changeStatus(id, open?.status || 'NEW', note, devName)
  }
  async function saveEdit(id: string, fields: Partial<DevReq>) {
    setBusy(true)
    try {
      const r = await fetch(`/api/dev-requests/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setRows((p) => p.map((x) => x.id === id ? j.request : x)); notify('บันทึกการแก้ไขแล้ว'); return true }
      notify(j.message || 'บันทึกไม่สำเร็จ'); return false
    } finally { setBusy(false) }
  }
  async function uploadImages(reqId: string, files: FileList | File[]) {
    setBusy(true)
    try {
      const added: DevImg[] = []
      for (const f of Array.from(files)) {
        const fd = new FormData(); fd.append('file', f)
        const url = isDev ? `/api/dev/team/${token}/${reqId}/image` : `/api/dev-requests/${reqId}/image`
        const r = await fetch(url, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (r.ok) added.push(j.image); else notify(j.message || 'อัปโหลดรูปไม่สำเร็จ')
      }
      if (added.length) { setRows((p) => p.map((x) => x.id === reqId ? { ...x, images: [...(x.images || []), ...added] } : x)); notify(`แนบรูป ${added.length} รูปแล้ว`) }
    } finally { setBusy(false) }
  }
  async function deleteImage(reqId: string, attId: string) {
    const r = await fetch(`/api/dev-requests/image/${attId}`, { method: 'DELETE' })
    if (r.ok) setRows((p) => p.map((x) => x.id === reqId ? { ...x, images: (x.images || []).filter((i) => i.id !== attId) } : x))
    else notify('ลบรูปไม่สำเร็จ')
  }
  async function del(id: string) {
    const ok = await askConfirm({ title: 'ลบคำขอนี้?', message: 'ประวัติการดำเนินงานและรูปแนบทั้งหมดจะถูกลบด้วย กู้คืนไม่ได้', confirmText: 'ลบคำขอ', danger: true })
    if (!ok) return
    setBusy(true)
    try {
      const r = await fetch(`/api/dev-requests/${id}`, { method: 'DELETE' })
      if (r.ok) { setRows((p) => p.filter((x) => x.id !== id)); setOpenId(null); notify('ลบคำขอแล้ว') }
      else notify('ลบไม่สำเร็จ')
    } finally { setBusy(false) }
  }
  async function copyBoardLink() {
    const link = `${base}/dev/team/${token}`
    try { await navigator.clipboard.writeText(link); notify('คัดลอกลิงก์บอร์ด (ทั้งหมด) แล้ว') } catch { notify(link) }
  }
  async function copyReqLink(id: string) {
    const link = `${base}/dev/team/${token}?req=${id}`
    try { await navigator.clipboard.writeText(link); notify('คัดลอกลิงก์คำขอนี้ (ส่งให้ทีมพัฒนาได้เลย)') } catch { notify(link) }
  }
  async function rotate() {
    const ok = await askConfirm({ title: 'สร้างลิงก์ทีมพัฒนาใหม่?', message: 'ลิงก์เดิมทั้งหมดจะใช้ไม่ได้อีกทันที ต้องส่งลิงก์ใหม่ให้ทีม', confirmText: 'สร้างลิงก์ใหม่', danger: true })
    if (!ok) return
    const r = await fetch('/api/dev-requests/token', { method: 'POST' })
    if (r.ok) { notify('สร้างลิงก์ใหม่แล้ว — กำลังรีเฟรช'); window.location.reload() }
  }
  async function saveTeamNote(note: string) {
    const r = await fetch('/api/dev-requests/token', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamNote: note }),
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setTeamNote(j.teamNote); notify('บันทึกโน้ตทีมพัฒนาแล้ว') } else notify('บันทึกไม่สำเร็จ')
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of DEV_STATUSES) c[s] = rows.filter((r) => r.status === s).length
    return c
  }, [rows])

  return (
    <div className="dvb">
      <style>{CSS}</style>

      <TeamNote note={teamNote} canEdit={!isDev} onSave={saveTeamNote} />

      {/* แถบเครื่องมือ */}
      <div className="dvb-toolbar">
        <div className="dvb-search">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5 17 17" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาคำขอ, โปรดัก, ผู้แจ้ง…" />
        </div>
        <button className={`dvb-chip ${typeFilter === 'ALL' ? 'on' : ''}`} onClick={() => setTypeFilter('ALL')}>ทั้งหมด</button>
        {DEV_TYPES.map((t) => (
          <button key={t} className={`dvb-chip ${typeFilter === t ? 'on' : ''}`} onClick={() => setTypeFilter(t)}>{TYPE_META[t].emoji} {TYPE_META[t].label}</button>
        ))}
        <span className="dvb-grow" />
        {!isDev && (
          <>
            <button className="dvb-btn" onClick={copyBoardLink} title="คัดลอกลิงก์บอร์ดทั้งหมด สำหรับส่งให้ทีมพัฒนา">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 12a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1M12 8a3 3 0 0 0-4 0l-2 2a3 3 0 0 0 4 4l1-1" /></svg>
              ลิงก์บอร์ด
            </button>
            <button className="dvb-btn dvb-primary" onClick={() => setShowCreate(true)}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M10 4v12M4 10h12" /></svg>
              คำขอใหม่
            </button>
          </>
        )}
      </div>

      {/* บอร์ด */}
      <div className="dvb-board-wrap">
        <div className="dvb-board">
          {DEV_STATUSES.map((s) => {
            const items = filtered.filter((r) => r.status === s)
            const tone = stTone(s)
            return (
              <div className="dvb-col" key={s}>
                <div className="dvb-col-head">
                  <span className="dvb-dot" style={{ background: SCLR[tone] }} />
                  <h3>{STATUS_META[s].emoji} {STATUS_META[s].label}</h3>
                  <span className="dvb-count">{counts[s] ?? 0}</span>
                </div>
                <div className="dvb-col-body">
                  {items.map((r) => <Card key={r.id} r={r} thumb={r.images?.[0] ? imgUrl(r.images[0]) : null} onClick={() => setOpenId(r.id)} />)}
                  {items.length === 0 && <div className="dvb-empty">— ว่าง —</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {open && (
        <Detail
          r={open} mode={mode} busy={busy} imgUrl={imgUrl} hasToken={!!token}
          onClose={() => setOpenId(null)}
          onStatus={(st, note, devName) => changeStatus(open.id, st, note, devName)}
          onComment={(note, devName) => addComment(open.id, note, devName)}
          onDelete={() => del(open.id)}
          onSaveEdit={(fields) => saveEdit(open.id, fields)}
          onUpload={(files) => uploadImages(open.id, files)}
          onDeleteImage={(attId) => deleteImage(open.id, attId)}
          onCopyLink={() => copyReqLink(open.id)}
        />
      )}
      {showCreate && !isDev && (
        <CreateForm busy={busy}
          onClose={() => setShowCreate(false)}
          onUpload={uploadImages}
          onCreated={(req) => { setRows((p) => [req, ...p]); notify(`เปิดคำขอ ${devCode(req.code)} แล้ว`); setOpenId(req.id); setShowCreate(false) }} />
      )}
      {!isDev && token && (
        <div className="dvb-footlink">
          🔗 ลิงก์บอร์ดทีมพัฒนา: <code>{base}/dev/team/{token.slice(0, 8)}…</code>
          <button onClick={copyBoardLink}>คัดลอก</button>
          <button onClick={rotate} className="danger">สร้างใหม่</button>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog opts={confirmState}
          onCancel={() => { confirmState.resolve(false); setConfirmState(null) }}
          onOk={() => { confirmState.resolve(true); setConfirmState(null) }} />
      )}
      {toast && createPortal(<div className="dvb-toast">{toast}</div>, document.body)}
    </div>
  )
}

// ── โน้ตหัวบอร์ด: ทีมพัฒนาคือใคร ──────────────────────────────────────────────
function TeamNote({ note, canEdit, onSave }: { note: string | null; canEdit: boolean; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(note || '')
  useEffect(() => { setVal(note || '') }, [note])

  if (!note && !canEdit) return null
  if (!note && canEdit && !editing) {
    return <button className="dvb-tn-add" onClick={() => setEditing(true)}>＋ เพิ่มโน้ต “ทีมพัฒนาคือใคร” (แสดงให้ทีมเห็นด้วย)</button>
  }
  return (
    <div className="dvb-teamnote">
      <span className="dvb-tn-ic">👥</span>
      {editing ? (
        <div className="dvb-tn-edit">
          <textarea value={val} onChange={(e) => setVal(e.target.value)} maxLength={500} rows={2} placeholder="เช่น ทีมพัฒนา: บริษัท ABC · คุณสมชาย 08x-xxx-xxxx · Line: @devteam" autoFocus />
          <div className="dvb-tn-actions">
            <button className="dvb-btn" onClick={() => { setVal(note || ''); setEditing(false) }}>ยกเลิก</button>
            <button className="dvb-btn dvb-primary" onClick={() => { onSave(val.trim()); setEditing(false) }}>บันทึก</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dvb-tn-body"><b>ทีมพัฒนา</b><span>{note}</span></div>
          {canEdit && <button className="dvb-tn-btn" onClick={() => setEditing(true)}>แก้ไข</button>}
        </>
      )}
    </div>
  )
}

// ── การ์ด ────────────────────────────────────────────────────────────────────
function Card({ r, thumb, onClick }: { r: DevReq; thumb: string | null; onClick: () => void }) {
  const ty = tyTone(r.type), pr = prTone(r.priority)
  const nImg = r.images?.length || 0
  return (
    <button className="dvb-card" onClick={onClick} style={{ ['--pc' as string]: PCLR[pr] }}>
      <div className="dvb-card-top">
        <span className="dvb-type" style={{ color: TCLR[ty], background: TCLR[ty] + '18' }}>{TYPE_META[r.type as DevType]?.emoji} {TYPE_META[r.type as DevType]?.label}</span>
        <span className="dvb-id">{devCode(r.code)}</span>
      </div>
      <div className="dvb-card-main">
        <div className="dvb-card-text">
          <h4>{r.title}</h4>
          <div className="dvb-card-meta"><span className="dvb-prod">🖥 {r.product}</span></div>
        </div>
        {thumb && <span className="dvb-thumb" style={{ backgroundImage: `url(${thumb})` }}>{nImg > 1 && <span className="dvb-thumb-n">+{nImg - 1}</span>}</span>}
      </div>
      <div className="dvb-card-foot">
        <span className="dvb-ava">{initials(r.reporterName)}</span>
        <span className="dvb-by">{(r.reporterName || 'ไม่ระบุ').split(' ')[0]} · {timeAgo(r.createdAt)}</span>
        {nImg > 0 && <span className="dvb-clip">📷 {nImg}</span>}
        <span className="dvb-pri" style={{ color: PCLR[pr], background: PCLR[pr] + '18' }}>{PRIORITY_META[r.priority as DevPriority]?.label}</span>
      </div>
    </button>
  )
}

// ── รายละเอียด + ไทม์ไลน์ + รูป + แก้ไข ────────────────────────────────────────
function Detail({ r, mode, busy, imgUrl, hasToken, onClose, onStatus, onComment, onDelete, onSaveEdit, onUpload, onDeleteImage, onCopyLink }: {
  r: DevReq; mode: 'staff' | 'dev'; busy: boolean; imgUrl: (i: DevImg) => string; hasToken: boolean
  onClose: () => void
  onStatus: (s: string, note?: string, devName?: string) => void
  onComment: (note: string, devName?: string) => void
  onDelete: () => void
  onSaveEdit: (fields: Partial<DevReq>) => Promise<boolean>
  onUpload: (files: FileList | File[]) => void
  onDeleteImage: (attId: string) => void
  onCopyLink: () => void
}) {
  const [note, setNote] = useState('')
  const [devName, setDevName] = useState('')
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isDev = mode === 'dev'
  const ty = tyTone(r.type), pr = prTone(r.priority)
  const curIdx = DEV_STATUSES.indexOf(r.status as DevStatus)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const steps = (r.steps || '').split('\n').filter(Boolean)
  const links = (r.links || '').split('\n').filter(Boolean)
  const imgs = r.images || []

  if (editing && !isDev) {
    return <EditForm r={r} busy={busy} onCancel={() => setEditing(false)} onSave={async (f) => { const ok = await onSaveEdit(f); if (ok) setEditing(false) }} />
  }

  return createPortal(
    <div className="dvb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dvb-modal" role="dialog" aria-modal="true">
        <div className="dvb-mhead">
          <div className="dvb-mrow">
            <span className="dvb-type" style={{ color: TCLR[ty], background: TCLR[ty] + '18' }}>{TYPE_META[r.type as DevType]?.emoji} {TYPE_META[r.type as DevType]?.label}</span>
            <span className="dvb-pri" style={{ color: PCLR[pr], background: PCLR[pr] + '18' }}>{PRIORITY_META[r.priority as DevPriority]?.label}</span>
            <span className="dvb-id" style={{ color: '#96A2B5' }}>{devCode(r.code)}</span>
            <button className="dvb-close" onClick={onClose} aria-label="ปิด">✕</button>
          </div>
          <h2>{r.title}</h2>
          {!isDev && hasToken && (
            <button className="dvb-linkbtn" onClick={onCopyLink} title="คัดลอกลิงก์เฉพาะคำขอนี้ ส่งให้ทีมพัฒนา">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 12a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1M12 8a3 3 0 0 0-4 0l-2 2a3 3 0 0 0 4 4l1-1" /></svg>
              คัดลอกลิงก์คำขอนี้ให้ทีมพัฒนา
            </button>
          )}
        </div>

        <div className="dvb-mbody">
          <div className="dvb-fieldgrid">
            <div className="dvb-field"><label>โปรดัก / หน้าจอ</label><div className="v">🖥 {r.product}</div></div>
            <div className="dvb-field"><label>ผู้แจ้ง</label><div className="v">{r.reporterName || 'ไม่ระบุ'} · {fmtDateTime(r.createdAt)}</div></div>
          </div>

          <div className="dvb-block"><label>อาการ / สิ่งที่ขอแก้</label><div className="dvb-txt">{r.detail}</div></div>
          {steps.length > 0 && (
            <div className="dvb-block"><label>ขั้นตอนทำซ้ำ</label><ol className="dvb-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
          )}
          {r.expected && <div className="dvb-block"><label>ผลลัพธ์ที่คาดหวัง</label><div className="dvb-txt">{r.expected}</div></div>}
          {links.length > 0 && (
            <div className="dvb-block"><label>ลิงก์แนบ</label><div className="dvb-links">{links.map((l, i) => <a key={i} href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a>)}</div></div>
          )}

          {/* รูปงาน */}
          <div className="dvb-block">
            <label>รูปงาน {imgs.length > 0 && `(${imgs.length})`}</label>
            <div className="dvb-gallery">
              {imgs.map((im) => (
                <span className="dvb-gitem" key={im.id}>
                  <a href={imgUrl(im)} target="_blank" rel="noopener noreferrer"><img src={imgUrl(im)} alt="รูปงาน" loading="lazy" /></a>
                  {!isDev && <button className="dvb-gdel" onClick={() => onDeleteImage(im.id)} title="ลบรูป">✕</button>}
                </span>
              ))}
              <button className="dvb-gadd" disabled={busy} onClick={() => fileRef.current?.click()}>
                <span>＋</span>แนบรูป
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
                onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = '' }} />
            </div>
          </div>

          <div className="dvb-block">
            <label>สถานะการดำเนินงาน{isDev ? ' — ทีมพัฒนาปรับได้ที่นี่' : ''}</label>
            <div className="dvb-stepper">
              {DEV_STATUSES.map((s, i) => {
                const active = i === curIdx, tone = stTone(s)
                return (
                  <button key={s} disabled={busy || active} className={active ? 'active' : ''}
                    style={active ? { background: SBG[tone], color: SCLR[tone] } : {}}
                    onClick={() => onStatus(s, note.trim() || undefined, devName.trim() || undefined)}>
                    <span className="k">{STATUS_META[s].emoji}</span>{STATUS_META[s].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="dvb-block">
            <label>ไทม์ไลน์การดำเนินงาน</label>
            <div className="dvb-tl">
              {[...r.events].reverse().map((e) => {
                const dev = e.actor === 'DEV'
                return (
                  <div className={`dvb-tlitem ${e.toStatus === 'DONE' ? 'done' : ''}`} key={e.id}>
                    <span className="node" style={{ borderColor: dev ? '#7A44C6' : 'var(--brand,#EA580C)' }} />
                    <div className="when">{fmtDateTime(e.createdAt)}</div>
                    <div className="who">{e.actorName || (dev ? 'ทีมพัฒนา' : 'เจ้าหน้าที่')} {dev && <span className="tag-dev">DEV</span>}</div>
                    <div className="what">
                      {e.fromStatus && e.toStatus ? <>เปลี่ยนสถานะ <b>{STATUS_META[e.toStatus as DevStatus]?.label}</b></>
                        : e.toStatus ? <b>{STATUS_META[e.toStatus as DevStatus]?.label}</b> : null}
                      {e.note && <div className="note">{e.note}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dvb-block">
            <label>เพิ่มคอมเมนต์ / อัปเดต</label>
            {isDev && <input className="dvb-devname" value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="ชื่อของคุณ (ทีมพัฒนา)" maxLength={60} />}
            <div className="dvb-commentbox">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="พิมพ์อัปเดต หรือสอบถามรายละเอียดเพิ่ม…" />
              <button className="dvb-btn dvb-primary" disabled={busy || !note.trim()} onClick={() => { onComment(note.trim(), devName.trim() || undefined); setNote('') }}>ส่ง</button>
            </div>
          </div>
        </div>

        <div className="dvb-mfoot">
          {isDev ? <span className="dvb-lock">👁 คุณดูผ่านลิงก์ทีมพัฒนา — แก้ได้แค่สถานะ · คอมเมนต์ · แนบรูป</span>
            : <span className="dvb-lock">🔒 อัปเดตล่าสุด {timeAgo(r.updatedAt)}</span>}
          <span className="dvb-grow" />
          {!isDev && <button className="dvb-btn" disabled={busy} onClick={() => setEditing(true)}>✏️ แก้ไข</button>}
          {!isDev && <button className="dvb-btn dvb-danger" disabled={busy} onClick={onDelete}>ลบ</button>}
        </div>
      </div>
    </div>, document.body)
}

// ── ฟอร์มแก้ไขคำขอ (เจ้าหน้าที่) ───────────────────────────────────────────────
function EditForm({ r, busy, onCancel, onSave }: { r: DevReq; busy: boolean; onCancel: () => void; onSave: (f: Partial<DevReq>) => void }) {
  const [type, setType] = useState<DevType>(r.type as DevType)
  const [priority, setPriority] = useState<DevPriority>(r.priority as DevPriority)
  const [product, setProduct] = useState(r.product)
  const [title, setTitle] = useState(r.title)
  const [detail, setDetail] = useState(r.detail)
  const [steps, setSteps] = useState(r.steps || '')
  const [expected, setExpected] = useState(r.expected || '')
  const [links, setLinks] = useState(r.links || '')
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  return createPortal(
    <div className="dvb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dvb-modal" role="dialog" aria-modal="true">
        <div className="dvb-mhead"><div className="dvb-mrow"><h2 style={{ fontSize: 18 }}>แก้ไขคำขอ {devCode(r.code)}</h2><button className="dvb-close" onClick={onCancel} aria-label="ปิด">✕</button></div></div>
        <div className="dvb-mbody">
          <div className="dvb-block"><label>ประเภท</label><div className="dvb-pick">{DEV_TYPES.map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{TYPE_META[t].emoji} {TYPE_META[t].label}</button>)}</div></div>
          <div className="dvb-block"><label>ความสำคัญ</label><div className="dvb-pick">{DEV_PRIORITIES.map((p) => <button key={p} className={priority === p ? 'on' : ''} onClick={() => setPriority(p)} style={priority === p ? { borderColor: PCLR[PRIORITY_META[p].tone], color: PCLR[PRIORITY_META[p].tone] } : {}}>{PRIORITY_META[p].label}</button>)}</div></div>
          <div className="dvb-block"><label>โปรดัก / หน้าจอ *</label><input className="dvb-inp" value={product} onChange={(e) => setProduct(e.target.value)} maxLength={120} /></div>
          <div className="dvb-block"><label>หัวข้อ *</label><input className="dvb-inp" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
          <div className="dvb-block"><label>อาการ / สิ่งที่ขอแก้ *</label><textarea className="dvb-inp" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={4000} /></div>
          <div className="dvb-block"><label>ขั้นตอนทำซ้ำ (บรรทัดละขั้น)</label><textarea className="dvb-inp" rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={2000} /></div>
          <div className="dvb-block"><label>ผลลัพธ์ที่คาดหวัง</label><textarea className="dvb-inp" rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={2000} /></div>
          <div className="dvb-block"><label>ลิงก์แนบ (บรรทัดละลิงก์)</label><textarea className="dvb-inp" rows={2} value={links} onChange={(e) => setLinks(e.target.value)} maxLength={1000} /></div>
          {err && <div className="dvb-err">{err}</div>}
        </div>
        <div className="dvb-mfoot">
          <span className="dvb-grow" />
          <button className="dvb-btn" onClick={onCancel}>ยกเลิก</button>
          <button className="dvb-btn dvb-primary" disabled={busy} onClick={() => {
            if (!product.trim() || !title.trim() || !detail.trim()) { setErr('กรุณากรอกโปรดัก หัวข้อ และรายละเอียดให้ครบ'); return }
            onSave({ type, priority, product, title, detail, steps, expected, links })
          }}>บันทึกการแก้ไข</button>
        </div>
      </div>
    </div>, document.body)
}

// ── ฟอร์มสร้างคำขอ ────────────────────────────────────────────────────────────
function CreateForm({ busy, onClose, onCreated, onUpload }: { busy: boolean; onClose: () => void; onCreated: (r: DevReq) => void; onUpload: (reqId: string, files: File[]) => void }) {
  const [type, setType] = useState<DevType>('BUG')
  const [priority, setPriority] = useState<DevPriority>('MEDIUM')
  const [product, setProduct] = useState('')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [links, setLinks] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const PRODUCTS = ['ตู้ Kiosk', 'แอปพิมพ์บัตรคิว', 'เว็บ Tracking', 'ระบบหลังบ้าน', 'อื่น ๆ']

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function submit() {
    if (!product.trim() || !title.trim() || !detail.trim()) { setErr('กรุณากรอกโปรดัก หัวข้อ และรายละเอียดให้ครบ'); return }
    setSaving(true); setErr('')
    try {
      const r = await fetch('/api/dev-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, priority, product, title, detail, steps, expected, links, website: '' }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.message || 'บันทึกไม่สำเร็จ'); return }
      if (files.length) onUpload(j.request.id, files)
      onCreated(j.request)
    } finally { setSaving(false) }
  }

  return createPortal(
    <div className="dvb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dvb-modal" role="dialog" aria-modal="true">
        <div className="dvb-mhead"><div className="dvb-mrow"><h2 style={{ fontSize: 18 }}>เปิดคำขอพัฒนาใหม่</h2><button className="dvb-close" onClick={onClose} aria-label="ปิด">✕</button></div></div>
        <div className="dvb-mbody">
          <div className="dvb-block"><label>ประเภท</label><div className="dvb-pick">{DEV_TYPES.map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{TYPE_META[t].emoji} {TYPE_META[t].label}</button>)}</div></div>
          <div className="dvb-block"><label>ความสำคัญ</label><div className="dvb-pick">{DEV_PRIORITIES.map((p) => <button key={p} className={priority === p ? 'on' : ''} onClick={() => setPriority(p)} style={priority === p ? { borderColor: PCLR[PRIORITY_META[p].tone], color: PCLR[PRIORITY_META[p].tone] } : {}}>{PRIORITY_META[p].label}</button>)}</div></div>
          <div className="dvb-block"><label>โปรดัก / หน้าจอที่ติดปัญหา *</label>
            <input className="dvb-inp" list="dvb-products" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="เช่น ตู้ Kiosk / แอปพิมพ์บัตรคิว" maxLength={120} />
            <datalist id="dvb-products">{PRODUCTS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="dvb-block"><label>หัวข้อ *</label><input className="dvb-inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="สรุปสั้น ๆ ว่าติดปัญหาอะไร / ขออะไร" maxLength={200} /></div>
          <div className="dvb-block"><label>อาการ / สิ่งที่ขอแก้ *</label><textarea className="dvb-inp" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="อธิบายอาการ หรือฟังก์ชันที่อยากได้ให้ละเอียด" maxLength={4000} /></div>
          <div className="dvb-block"><label>ขั้นตอนทำซ้ำ (บรรทัดละขั้น)</label><textarea className="dvb-inp" rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'เปิดหน้า…\nกดปุ่ม…\nเกิดอาการ…'} maxLength={2000} /></div>
          <div className="dvb-block"><label>ผลลัพธ์ที่คาดหวัง</label><textarea className="dvb-inp" rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="อยากให้ผลลัพธ์เป็นอย่างไร" maxLength={2000} /></div>
          <div className="dvb-block"><label>รูปงาน (แนบได้หลายรูป)</label>
            <div className="dvb-gallery">
              {files.map((f, i) => <span className="dvb-gitem" key={i}><img src={URL.createObjectURL(f)} alt={f.name} /><button className="dvb-gdel" onClick={() => setFiles((p) => p.filter((_, k) => k !== i))} title="เอาออก">✕</button></span>)}
              <button className="dvb-gadd" onClick={() => fileRef.current?.click()}><span>＋</span>เลือกรูป</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
                onChange={(e) => { if (e.target.files) setFiles((p) => [...p, ...Array.from(e.target.files!)]); e.target.value = '' }} />
            </div>
          </div>
          <div className="dvb-block"><label>ลิงก์แนบเพิ่มเติม (รูป/วิดีโอ — บรรทัดละลิงก์)</label><textarea className="dvb-inp" rows={2} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="วาง URL ประกอบ (ถ้ามี)" maxLength={1000} /></div>
          {err && <div className="dvb-err">{err}</div>}
        </div>
        <div className="dvb-mfoot">
          <span className="dvb-grow" />
          <button className="dvb-btn" onClick={onClose}>ยกเลิก</button>
          <button className="dvb-btn dvb-primary" disabled={saving || busy} onClick={submit}>{saving ? 'กำลังบันทึก…' : 'เปิดคำขอ'}</button>
        </div>
      </div>
    </div>, document.body)
}

// ── กล่องยืนยัน (แทน confirm() เบราว์เซอร์) ────────────────────────────────────
function ConfirmDialog({ opts, onCancel, onOk }: { opts: ConfirmOpts; onCancel: () => void; onOk: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onOk() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onCancel, onOk])
  return createPortal(
    <div className="dvb-overlay dvb-overlay-c" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dvb-confirm" role="alertdialog" aria-modal="true">
        <div className={`dvb-cf-ic ${opts.danger ? 'danger' : ''}`}>{opts.danger ? '⚠️' : '❓'}</div>
        <h3>{opts.title}</h3>
        {opts.message && <p>{opts.message}</p>}
        <div className="dvb-cf-actions">
          <button className="dvb-btn" onClick={onCancel} autoFocus>ยกเลิก</button>
          <button className={`dvb-btn ${opts.danger ? 'dvb-danger-solid' : 'dvb-primary'}`} onClick={onOk}>{opts.confirmText || 'ยืนยัน'}</button>
        </div>
      </div>
    </div>, document.body)
}

// ── สไตล์ (light — เข้าชุดกับหน้าออฟฟิศ) ───────────────────────────────────────
const CSS = `
.dvb { --line:#E7EDF4; --line2:#DCE4EE; --ink:#1B2430; --muted:#74839A; --muted2:#96A2B5; --surface:#fff; --surface2:#F7F9FC; --brand:var(--brand,#EA580C); --radius:14px; --shadow:0 1px 2px rgba(20,30,45,.05),0 4px 14px rgba(20,30,45,.06); --shadow-lg:0 12px 44px rgba(18,26,40,.20); }
.dvb *{ box-sizing:border-box; }
.dvb-teamnote{ display:flex; align-items:flex-start; gap:10px; background:#F3EEFB; border:1px solid #E2D5F5; border-radius:12px; padding:11px 14px; margin-bottom:14px; }
.dvb-tn-ic{ font-size:16px; line-height:1.4; }
.dvb-tn-body{ flex:1; font-size:13px; color:#4A3A63; display:flex; flex-direction:column; gap:1px; }
.dvb-tn-body b{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:#7A44C6; }
.dvb-tn-body span{ white-space:pre-line; }
.dvb-tn-btn{ border:1px solid #D9C7F0; background:#fff; color:#7A44C6; font-weight:600; font-size:11.5px; padding:4px 10px; border-radius:7px; cursor:pointer; font-family:inherit; }
.dvb-tn-edit{ flex:1; display:flex; flex-direction:column; gap:8px; }
.dvb-tn-edit textarea{ width:100%; border:1px solid #D9C7F0; border-radius:10px; padding:9px 12px; font-family:inherit; font-size:13px; resize:vertical; color:var(--ink); }
.dvb-tn-edit textarea:focus{ outline:none; border-color:#7A44C6; box-shadow:0 0 0 3px #ece0fb; }
.dvb-tn-actions{ display:flex; gap:8px; justify-content:flex-end; }
.dvb-tn-add{ display:block; width:100%; text-align:left; border:1px dashed var(--line2); background:var(--surface2); color:var(--muted); font-size:12.5px; font-weight:600; padding:9px 14px; border-radius:12px; margin-bottom:14px; cursor:pointer; font-family:inherit; }
.dvb-tn-add:hover{ border-color:#B98BE6; color:#7A44C6; }
.dvb-toolbar{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
.dvb-search{ flex:1; min-width:180px; position:relative; }
.dvb-search input{ width:100%; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:10px; padding:9px 12px 9px 34px; font-size:13px; font-family:inherit; }
.dvb-search input:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent); }
.dvb-search svg{ position:absolute; left:11px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--muted2); }
.dvb-chip{ border:1px solid var(--line); background:var(--surface); color:var(--muted); font-size:12.5px; font-weight:600; padding:7px 12px; border-radius:20px; cursor:pointer; font-family:inherit; white-space:nowrap; }
.dvb-chip:hover{ border-color:var(--line2); }
.dvb-chip.on{ background:var(--ink); color:#fff; border-color:var(--ink); }
.dvb-grow{ flex:1; }
.dvb-btn{ border:1px solid var(--line2); background:var(--surface); color:var(--ink); font-weight:600; font-size:13px; padding:8px 14px; border-radius:10px; display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-family:inherit; }
.dvb-btn:hover{ border-color:var(--brand); color:var(--brand); }
.dvb-btn:disabled{ opacity:.5; cursor:default; }
.dvb-btn svg{ width:16px; height:16px; }
.dvb-btn.dvb-primary{ background:var(--brand); border-color:var(--brand); color:#fff; }
.dvb-btn.dvb-primary:hover{ filter:brightness(.95); color:#fff; }
.dvb-btn.dvb-danger{ border-color:#E7B4B4; color:#C13540; }
.dvb-btn.dvb-danger:hover{ background:#FBE9E9; border-color:#C13540; color:#C13540; }
.dvb-btn.dvb-danger-solid{ background:#C13540; border-color:#C13540; color:#fff; }
.dvb-btn.dvb-danger-solid:hover{ filter:brightness(.95); color:#fff; }
.dvb-board-wrap{ overflow-x:auto; padding-bottom:10px; }
.dvb-board{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(258px,1fr); gap:14px; min-height:360px; }
@media(max-width:900px){ .dvb-board{ grid-auto-columns:270px; } }
.dvb-col{ background:var(--surface2); border:1px solid var(--line); border-radius:var(--radius); display:flex; flex-direction:column; max-height:70vh; }
.dvb-col-head{ display:flex; align-items:center; gap:8px; padding:13px 14px 10px; }
.dvb-dot{ width:9px; height:9px; border-radius:3px; flex-shrink:0; }
.dvb-col-head h3{ margin:0; font-size:13px; font-weight:700; color:var(--ink); }
.dvb-count{ margin-left:auto; font-size:11.5px; font-weight:700; color:var(--muted); background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:1px 8px; min-width:22px; text-align:center; }
.dvb-col-body{ padding:0 10px 10px; display:flex; flex-direction:column; gap:10px; overflow-y:auto; }
.dvb-empty{ text-align:center; color:var(--muted2); font-size:12px; padding:18px 0; }
.dvb-card{ position:relative; background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:12px 12px 11px 15px; box-shadow:var(--shadow); text-align:left; width:100%; display:block; cursor:pointer; font-family:inherit; transition:transform .12s,box-shadow .12s,border-color .12s; }
.dvb-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-lg); border-color:var(--line2); }
.dvb-card::before{ content:""; position:absolute; left:0; top:10px; bottom:10px; width:3.5px; border-radius:4px; background:var(--pc,#7A879B); }
.dvb-card-top{ display:flex; align-items:center; gap:7px; margin-bottom:7px; }
.dvb-type{ display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:2px 7px; border-radius:7px; white-space:nowrap; }
.dvb-id{ margin-left:auto; font-size:10.5px; color:var(--muted2); font-variant-numeric:tabular-nums; letter-spacing:.02em; }
.dvb-card-main{ display:flex; align-items:flex-start; gap:9px; }
.dvb-card-text{ flex:1; min-width:0; }
.dvb-card h4{ margin:0 0 8px; font-size:13.5px; font-weight:600; line-height:1.4; color:var(--ink); }
.dvb-card-meta{ display:flex; align-items:center; gap:8px; }
.dvb-prod{ display:inline-flex; align-items:center; gap:4px; background:var(--surface2); border:1px solid var(--line); padding:2px 7px; border-radius:6px; font-weight:600; color:var(--muted); font-size:11px; }
.dvb-thumb{ position:relative; width:46px; height:46px; border-radius:9px; background-size:cover; background-position:center; flex-shrink:0; border:1px solid var(--line); }
.dvb-thumb-n{ position:absolute; right:-4px; bottom:-4px; background:var(--ink); color:#fff; font-size:9px; font-weight:700; padding:1px 5px; border-radius:8px; }
.dvb-card-foot{ display:flex; align-items:center; gap:6px; margin-top:9px; padding-top:9px; border-top:1px dashed var(--line); font-size:11px; color:var(--muted); }
.dvb-ava{ width:19px; height:19px; border-radius:50%; background:color-mix(in srgb,var(--brand) 15%,#fff); color:var(--brand); display:grid; place-items:center; font-size:9.5px; font-weight:700; }
.dvb-clip{ font-size:10px; color:var(--muted); }
.dvb-pri{ margin-left:auto; font-size:10px; font-weight:700; padding:1px 6px; border-radius:5px; white-space:nowrap; }
.dvb-overlay{ position:fixed; inset:0; background:rgba(15,22,33,.5); backdrop-filter:blur(3px); z-index:60; display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto; }
.dvb-overlay-c{ align-items:center; z-index:70; }
.dvb-modal{ background:var(--surface); border:1px solid var(--line); border-radius:18px; width:100%; max-width:640px; box-shadow:var(--shadow-lg); overflow:hidden; animation:dvbpop .18s ease; }
@keyframes dvbpop{ from{ transform:translateY(12px) scale(.98); opacity:0; } }
@media(prefers-reduced-motion:reduce){ .dvb-modal,.dvb-card,.dvb-confirm{ animation:none!important; transition:none!important; } }
.dvb-mhead{ padding:18px 20px 16px; border-bottom:1px solid var(--line); }
.dvb-mrow{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.dvb-mhead h2{ margin:0; font-size:18px; font-weight:700; line-height:1.35; color:var(--ink); }
.dvb-linkbtn{ margin-top:11px; border:1px solid #D9C7F0; background:#F6F0FD; color:#7A44C6; font-weight:600; font-size:12px; padding:6px 11px; border-radius:9px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; }
.dvb-linkbtn:hover{ background:#efe4fb; }
.dvb-linkbtn svg{ width:15px; height:15px; }
.dvb-close{ margin-left:auto; border:0; background:var(--surface2); color:var(--muted); width:30px; height:30px; border-radius:9px; font-size:15px; display:grid; place-items:center; cursor:pointer; }
.dvb-close:hover{ background:var(--line); color:var(--ink); }
.dvb-mbody{ padding:18px 20px; display:flex; flex-direction:column; gap:16px; max-height:min(72vh,720px); overflow-y:auto; }
.dvb-fieldgrid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:520px){ .dvb-fieldgrid{ grid-template-columns:1fr; } }
.dvb-field label,.dvb-block label{ font-size:11px; font-weight:700; color:var(--muted2); text-transform:uppercase; letter-spacing:.04em; }
.dvb-field .v{ margin-top:3px; font-size:13.5px; font-weight:500; color:var(--ink); }
.dvb-block label{ display:block; margin-bottom:5px; }
.dvb-txt{ background:var(--surface2); border:1px solid var(--line); border-radius:10px; padding:11px 13px; font-size:13px; line-height:1.55; white-space:pre-line; color:var(--ink); }
.dvb-links{ display:flex; flex-direction:column; gap:4px; }
.dvb-links a{ font-size:12.5px; color:var(--brand); word-break:break-all; }
.dvb-steps{ counter-reset:s; margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:5px; }
.dvb-steps li{ position:relative; padding-left:26px; font-size:13px; color:var(--ink); }
.dvb-steps li::before{ counter-increment:s; content:counter(s); position:absolute; left:0; top:1px; width:18px; height:18px; border-radius:6px; background:color-mix(in srgb,var(--brand) 14%,#fff); color:var(--brand); font-size:10px; font-weight:700; display:grid; place-items:center; }
.dvb-gallery{ display:flex; flex-wrap:wrap; gap:8px; }
.dvb-gitem{ position:relative; width:84px; height:84px; border-radius:10px; overflow:hidden; border:1px solid var(--line); background:var(--surface2); }
.dvb-gitem img{ width:100%; height:100%; object-fit:cover; display:block; }
.dvb-gdel{ position:absolute; top:3px; right:3px; width:20px; height:20px; border:0; border-radius:6px; background:rgba(15,22,33,.62); color:#fff; font-size:11px; cursor:pointer; display:grid; place-items:center; }
.dvb-gdel:hover{ background:#C13540; }
.dvb-gadd{ width:84px; height:84px; border:1.5px dashed var(--line2); border-radius:10px; background:var(--surface2); color:var(--muted); font-size:11.5px; font-weight:600; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; font-family:inherit; }
.dvb-gadd span{ font-size:19px; line-height:1; }
.dvb-gadd:hover{ border-color:var(--brand); color:var(--brand); }
.dvb-gadd:disabled{ opacity:.5; cursor:default; }
.dvb-stepper{ display:flex; gap:0; background:var(--surface2); border:1px solid var(--line); border-radius:12px; padding:6px; overflow-x:auto; }
.dvb-stepper button{ flex:1; border:0; background:transparent; color:var(--muted); font-weight:600; font-size:11.5px; padding:8px 6px; border-radius:8px; white-space:nowrap; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:74px; cursor:pointer; font-family:inherit; }
.dvb-stepper button:not(.active):not(:disabled):hover{ background:var(--surface); color:var(--ink); }
.dvb-stepper button:disabled{ cursor:default; }
.dvb-stepper button.active{ box-shadow:var(--shadow); }
.dvb-stepper .k{ font-size:15px; }
.dvb-tl{ position:relative; }
.dvb-tlitem{ position:relative; padding:0 0 15px 24px; }
.dvb-tlitem::before{ content:""; position:absolute; left:6px; top:4px; bottom:-2px; width:2px; background:var(--line); }
.dvb-tlitem:last-child::before{ display:none; }
.dvb-tlitem .node{ position:absolute; left:0; top:3px; width:13px; height:13px; border-radius:50%; background:#fff; border:2.5px solid var(--brand); }
.dvb-tlitem.done .node{ border-color:#1F8A54; background:#1F8A54; }
.dvb-tlitem .when{ font-size:10.5px; color:var(--muted2); }
.dvb-tlitem .who{ font-weight:700; font-size:12.5px; color:var(--ink); display:flex; align-items:center; gap:6px; }
.dvb-tlitem .tag-dev{ font-size:8.5px; font-weight:800; color:#7A44C6; background:#F0E8FB; padding:1px 5px; border-radius:5px; letter-spacing:.04em; }
.dvb-tlitem .what{ font-size:12.5px; color:var(--muted); margin-top:1px; }
.dvb-tlitem .what b{ color:var(--ink); font-weight:600; }
.dvb-tlitem .note{ margin-top:4px; background:var(--surface2); border:1px solid var(--line); border-radius:8px; padding:7px 10px; color:var(--ink); white-space:pre-line; }
.dvb-commentbox{ display:flex; gap:8px; align-items:flex-start; }
.dvb-commentbox textarea{ flex:1; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:10px; padding:10px 12px; font-family:inherit; font-size:13px; resize:vertical; min-height:44px; }
.dvb-commentbox textarea:focus,.dvb-inp:focus,.dvb-devname:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent); }
.dvb-devname{ width:100%; margin-bottom:8px; border:1px solid var(--line); border-radius:10px; padding:9px 12px; font-family:inherit; font-size:13px; color:var(--ink); }
.dvb-inp{ width:100%; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:10px; padding:10px 12px; font-family:inherit; font-size:13px; resize:vertical; }
.dvb-pick{ display:flex; gap:7px; flex-wrap:wrap; }
.dvb-pick button{ border:1px solid var(--line2); background:var(--surface); color:var(--muted); font-weight:600; font-size:12.5px; padding:7px 13px; border-radius:9px; cursor:pointer; font-family:inherit; }
.dvb-pick button.on{ border-color:var(--brand); color:var(--brand); background:color-mix(in srgb,var(--brand) 8%,#fff); }
.dvb-mfoot{ padding:14px 20px; border-top:1px solid var(--line); background:var(--surface2); display:flex; align-items:center; gap:10px; font-size:12px; color:var(--muted); }
.dvb-lock{ color:var(--muted); }
.dvb-err{ background:#FBE9E9; border:1px solid #E7B4B4; color:#B0272F; border-radius:10px; padding:9px 12px; font-size:12.5px; }
.dvb-footlink{ margin-top:16px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12px; color:var(--muted); background:var(--surface2); border:1px solid var(--line); border-radius:12px; padding:10px 14px; }
.dvb-footlink code{ background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:2px 7px; font-size:11.5px; color:var(--ink); word-break:break-all; }
.dvb-footlink button{ border:1px solid var(--line2); background:var(--surface); color:var(--ink); font-weight:600; font-size:11.5px; padding:4px 10px; border-radius:7px; cursor:pointer; font-family:inherit; }
.dvb-footlink button:hover{ border-color:var(--brand); color:var(--brand); }
.dvb-footlink button.danger:hover{ border-color:#C13540; color:#C13540; }
.dvb-confirm{ background:var(--surface); border-radius:18px; width:100%; max-width:400px; box-shadow:var(--shadow-lg); padding:24px; text-align:center; animation:dvbpop .16s ease; }
.dvb-cf-ic{ width:52px; height:52px; border-radius:50%; background:#EEF1F5; display:grid; place-items:center; font-size:24px; margin:0 auto 14px; }
.dvb-cf-ic.danger{ background:#FBE9E9; }
.dvb-confirm h3{ margin:0 0 6px; font-size:16.5px; font-weight:700; color:var(--ink); }
.dvb-confirm p{ margin:0 0 18px; font-size:13px; color:var(--muted); line-height:1.55; }
.dvb-cf-actions{ display:flex; gap:9px; }
.dvb-cf-actions button{ flex:1; justify-content:center; }
.dvb-toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1B2430; color:#fff; padding:11px 18px; border-radius:11px; font-size:13px; font-weight:600; box-shadow:var(--shadow-lg); z-index:90; }
`
