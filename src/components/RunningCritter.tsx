'use client'
import { useEffect, useState } from 'react'

// สัตว์วิ่งไปมาที่ขอบล่างของหน้า — เบามาก (emoji 1 ตัว + CSS transform, ไม่มีรูป/ไลบรารี)
// pointer-events:none จึงไม่บังการกดปุ่ม · เคารพ prefers-reduced-motion · สลับตัวเป็นระยะ
const ANIMALS = ['🐈', '🐕', '🦆', '🐢', '🐇', '🐿️', '🦔', '🐤', '🦫', '🐥']

export function RunningCritter() {
  const [i, setI] = useState(0)

  useEffect(() => {
    // สุ่มตัวเริ่ม แล้วสลับทุก ~1 รอบการวิ่ง
    setI(Math.floor(Math.random() * ANIMALS.length))
    const id = window.setInterval(() => setI((v) => (v + 1) % ANIMALS.length), 24000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="kiosk-critter" aria-hidden="true">
      <span className="kiosk-critter-in">{ANIMALS[i]}</span>
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
.kiosk-critter{ position:fixed; left:0; bottom:6px; z-index:5; pointer-events:none; user-select:none; will-change:transform; animation:kc-x 24s linear infinite; }
.kiosk-critter-in{ display:inline-block; font-size:30px; line-height:1; filter:drop-shadow(0 2px 2px rgba(0,0,0,.15)); animation:kc-bob .5s ease-in-out infinite; }
@keyframes kc-x{
  0%{ transform:translateX(0) scaleX(1); }
  48%{ transform:translateX(calc(100vw - 46px)) scaleX(1); }
  50%{ transform:translateX(calc(100vw - 46px)) scaleX(-1); }
  98%{ transform:translateX(0) scaleX(-1); }
  100%{ transform:translateX(0) scaleX(1); }
}
@keyframes kc-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@media (prefers-reduced-motion: reduce){ .kiosk-critter{ display:none; } }
@media print{ .kiosk-critter{ display:none; } }
`
