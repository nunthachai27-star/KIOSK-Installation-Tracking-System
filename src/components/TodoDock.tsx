'use client'
import { useCallback, useEffect, useState } from 'react'

type T = { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done'
const OPEN_KEY = 'kioskTodoOpen'

export function TodoDock() {
  const [ready, setReady] = useState(false)
  const [open, setOpenState] = useState(false)
  const [items, setItems] = useState<T[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [text, setText] = useState('')
  const [left, setLeft] = useState(12)
  const [fits, setFits] = useState(false) // ช่องว่างซ้ายกว้างพอให้กางค้างโดยไม่ทับเนื้อหาไหม

  // สถานะเปิด/ปิด (จำไว้) — กางค้างเฉพาะจอที่ช่องว่างพอ, ไม่งั้นเริ่มเป็นปุ่มย่อ
  useEffect(() => {
    const g0 = (window.innerWidth - 1160) / 2
    const f0 = g0 >= 306
    let o = false
    try { const s = localStorage.getItem(OPEN_KEY); o = f0 && (s === null ? true : s === '1') }
    catch { o = f0 }
    setFits(f0); setLeft(f0 ? Math.round(g0 - 288 - 10) : 12); setOpenState(o); setReady(true)
  }, [])
  const setOpen = (v: boolean) => { setOpenState(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }

  useEffect(() => {
    fetch('/api/todos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { items: [] })).then((j) => setItems(j.items ?? [])).catch(() => {})
  }, [])

  // วางในช่องว่างซ้ายถ้ากว้างพอ (กางค้าง) ไม่งั้นเป็นแผงลอยชิดขอบ
  useEffect(() => {
    const calc = () => { const g = (window.innerWidth - 1160) / 2; const f = g >= 306; setFits(f); setLeft(f ? Math.round(g - 288 - 10) : 12) }
    window.addEventListener('resize', calc); return () => window.removeEventListener('resize', calc)
  }, [])

  const add = useCallback(async () => {
    const t = text.trim(); if (!t) return
    setText('')
    const r = await fetch('/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) })
    if (r.ok) { const j = await r.json(); setItems((p) => [j.item, ...p]) }
  }, [text])
  async function toggle(it: T) {
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
    await fetch(`/api/todos/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !it.done }) }).catch(() => {})
  }
  async function del(id: string) {
    setItems((p) => p.filter((x) => x.id !== id))
    await fetch(`/api/todos/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  async function edit(it: T) {
    const v = prompt('แก้ไขรายการ', it.text); if (v == null) return
    const t = v.trim(); if (!t) return
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, text: t } : x)))
    await fetch(`/api/todos/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) }).catch(() => {})
  }
  async function clearDone() {
    setItems((p) => p.filter((i) => !i.done))
    await fetch('/api/todos/done', { method: 'DELETE' }).catch(() => {})
  }

  if (!ready) return null
  const active = items.filter((i) => !i.done).length
  const doneN = items.length - active
  const shown = items.filter((i) => (filter === 'all' ? true : filter === 'active' ? !i.done : i.done))

  return (
    <>
      <style>{CSS}</style>

      {!open && (
        <button className="td-fab" onClick={() => setOpen(true)} title="สิ่งที่ต้องทำ" aria-label="เปิดสิ่งที่ต้องทำ">
          📝{active > 0 && <span className="td-fab__n">{active}</span>}
        </button>
      )}

      {open && !fits && <div className="td-backdrop" onClick={() => setOpen(false)} />}

      {open && (
        <section className={`td-dock${fits ? '' : ' td-dock--drawer'}`} style={{ left }} aria-label="สิ่งที่ต้องทำ">
          <div className="td-top">
            <div className="td-title">
              <b>✅ สิ่งที่ต้องทำ</b>
              <button className="td-collapse" onClick={() => setOpen(false)} title="ย่อ" aria-label="ย่อ">‹</button>
            </div>
            <div className="td-sub">เห็นเฉพาะของคุณ</div>
          </div>

          <div className="td-add">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              placeholder="เพิ่มสิ่งที่ต้องทำ…" maxLength={300} />
            <button onClick={add}>เพิ่ม</button>
          </div>

          <div className="td-tabs">
            {([['all', 'ทั้งหมด'], ['active', 'ค้างอยู่'], ['done', 'เสร็จ']] as const).map(([f, label]) => (
              <button key={f} aria-selected={filter === f} onClick={() => setFilter(f)}>
                {label}{f === 'active' && active ? ` (${active})` : ''}{f === 'done' && doneN ? ` (${doneN})` : ''}
              </button>
            ))}
          </div>

          <ul className="td-list">
            {shown.length === 0 ? (
              <li className="td-empty"><div className="td-empty__b">🗒️</div>
                {filter === 'done' ? 'ยังไม่มีรายการที่เสร็จ' : filter === 'active' ? 'ไม่มีงานค้าง — เยี่ยม!' : 'ยังไม่มีสิ่งที่ต้องทำ'}</li>
            ) : shown.map((it) => (
              <li key={it.id} className={`td-item${it.done ? ' done' : ''}`}>
                <button className="td-box" onClick={() => toggle(it)} title="ติ๊กเสร็จ" aria-label="ติ๊กเสร็จ">
                  <svg viewBox="0 0 12 12"><path d="M2 6.2 4.6 9 10 3" /></svg>
                </button>
                <span className="td-txt" onDoubleClick={() => edit(it)} title="ดับเบิลคลิกเพื่อแก้ไข">{it.text}</span>
                <button className="td-del" onClick={() => del(it.id)} title="ลบ" aria-label="ลบ">×</button>
              </li>
            ))}
          </ul>

          <div className="td-foot">
            <span>{active ? `เหลือ ${active} รายการ` : items.length ? 'เสร็จหมดแล้ว 🎉' : 'โน้ตส่วนตัว'}</span>
            {doneN > 0 && <button onClick={clearDone}>ล้างที่เสร็จ</button>}
          </div>
        </section>
      )}
    </>
  )
}

const CSS = `
.td-fab{position:fixed;left:14px;bottom:20px;z-index:30;width:46px;height:46px;border-radius:50%;
  border:1px solid #E7EDF4;background:#fff;color:#1F2A3C;font-size:20px;cursor:pointer;
  box-shadow:0 10px 26px -10px rgba(18,45,90,.4);display:grid;place-items:center;transition:transform .15s,border-color .15s}
.td-fab:hover{transform:translateY(-2px);border-color:var(--brand)}
.td-fab__n{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;
  background:var(--brand);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}

.td-backdrop{position:fixed;inset:0;z-index:39;background:rgba(15,22,33,.28);backdrop-filter:blur(1px)}
.td-dock{position:fixed;top:74px;z-index:30;width:min(288px,calc(100vw - 24px));
  max-height:calc(100dvh - 92px);display:flex;flex-direction:column;background:#fff;border:1px solid #E7EDF4;
  border-radius:18px;box-shadow:0 18px 46px -22px rgba(18,45,90,.5);overflow:hidden;
  font-family:'Sarabun','Leelawadee UI',system-ui,'Segoe UI',sans-serif}
.td-dock--drawer{z-index:40;box-shadow:0 24px 60px -18px rgba(18,45,90,.6)}
.td-top{padding:12px 14px 10px;border-bottom:1px solid #EEF1F5}
.td-title{display:flex;align-items:center;gap:8px}
.td-title b{font-size:14.5px;font-weight:700;color:#1F2A3C}
.td-collapse{margin-left:auto;width:26px;height:26px;border:0;background:#F4F6F9;color:#8492A6;border-radius:8px;
  font-size:18px;line-height:1;cursor:pointer}
.td-collapse:hover{background:#E7EBF0;color:#3C4A5E}
.td-sub{margin-top:3px;font-size:11px;color:#8492A6}

.td-add{display:flex;gap:6px;padding:10px 12px 8px}
.td-add input{flex:1;min-width:0;font:inherit;font-size:12.5px;color:#1F2A3C;border:1px solid #DCE4EE;
  border-radius:10px;padding:8px 10px;outline:none}
.td-add input:focus{border-color:var(--brand)}
.td-add button{flex:0 0 auto;font:inherit;font-size:12.5px;font-weight:600;color:#fff;background:var(--brand);
  border:0;border-radius:10px;padding:0 13px;cursor:pointer}
.td-add button:hover{background:var(--brand-strong)}

.td-tabs{display:flex;gap:4px;padding:0 12px 8px}
.td-tabs button{font:inherit;font-size:11.5px;font-weight:600;color:#8492A6;background:transparent;border:0;
  border-radius:999px;padding:4px 10px;cursor:pointer}
.td-tabs button[aria-selected="true"]{color:var(--brand);background:var(--brand-soft,#FFF1E8)}

.td-list{list-style:none;margin:0;padding:2px 6px 6px;display:flex;flex-direction:column;gap:1px;overflow-y:auto}
.td-item{display:flex;align-items:flex-start;gap:8px;padding:8px 7px;border-radius:10px}
.td-item:hover{background:#F7F9FC}
.td-box{flex:0 0 auto;margin-top:1px;width:18px;height:18px;border-radius:6px;border:1.7px solid #DCE4EE;
  background:transparent;cursor:pointer;display:grid;place-items:center}
.td-box:hover{border-color:var(--brand)}
.td-box svg{width:10px;height:10px;stroke:#fff;stroke-width:3;fill:none;opacity:0}
.td-item.done .td-box{background:#157F4C;border-color:#157F4C}
.td-item.done .td-box svg{opacity:1}
.td-txt{flex:1;min-width:0;font-size:12.5px;line-height:1.45;color:#1F2A3C;word-break:break-word;cursor:text}
.td-item.done .td-txt{color:#B6C0CE;text-decoration:line-through}
.td-del{flex:0 0 auto;width:22px;height:22px;border:0;background:transparent;color:#B6C0CE;border-radius:7px;
  cursor:pointer;opacity:0;font-size:15px;line-height:1}
.td-item:hover .td-del{opacity:1}
.td-del:hover{background:#FBE4E4;color:#C13540}
.td-empty{padding:22px 12px;text-align:center;color:#B6C0CE;font-size:12px}
.td-empty__b{font-size:24px;margin-bottom:3px}

.td-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px 11px;
  border-top:1px solid #EEF1F5;font-size:11px;color:#8492A6}
.td-foot button{font:inherit;font-size:11px;font-weight:600;color:#8492A6;background:transparent;border:0;cursor:pointer}
.td-foot button:hover{color:#C13540}

@media print{.td-fab,.td-dock{display:none !important}}
`
