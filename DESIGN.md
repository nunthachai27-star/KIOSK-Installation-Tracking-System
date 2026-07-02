# DESIGN.md — KIOSK Tracking

ระบบดีไซน์กลางของแอป (อ่านก่อนสร้าง/แก้ UI ทุกครั้ง เพื่อให้ทุกหน้ามีสไตล์เดียวกัน)
ทิศทาง: **Calm Enterprise** — สะอาด มืออาชีพ ข้อมูลอ่านง่าย เงานุ่ม โค้งมน motion ละมุน

## Colors
```
--brand:        #2F6BED   /* primary */
--brand-strong: #1E51D0   /* hover/pressed */
--brand-soft:   #EAF1FF   /* active pill / tint bg */
--brand-tint:   #F3F6FF   /* very light wash */
--accent-2:     #6D5DF6   /* gradient partner (indigo→violet) */

--ink:      #12233B       /* headings */
--body:     #3C4A5E       /* body text */
--muted:    #6B7A90       /* secondary */
--faint:    #9AA7BC       /* captions/placeholder */

--bg:       #F4F6FB       /* page background */
--surface:  #FFFFFF       /* cards */
--subtle:   #F8FAFD       /* zebra / inset */
--border:   #E7EDF4       /* card border */
--hairline: #EEF2F8       /* dividers */
```
Semantic: success `#157F4C`/`#E2F3EA` · warning `#9A6B10`/`#FAF0D8` · danger `#C13540`/`#FBE4E4` · info `#1B5FD9`/`#E4EEFF`
Brand gradient: `linear-gradient(135deg,#2F6BED,#6D5DF6)` — ใช้กับโลโก้/accent เล็กๆ เท่านั้น (ใช้อย่างมีวินัย)

## Typography
Font: `IBM Plex Sans Thai` (display+body), ตัวเลขข้อมูลใช้ `font-variant-numeric: tabular-nums`
```
Display  30px / 700 / -0.02em
H1       21px / 700 / -0.01em
H2       17px / 700
Title    15px / 700
Body     14px / 400–500
Caption  12px / 500 / +0.01em  (uppercase สำหรับ eyebrow)
```

## Radius & Elevation
```
radius: sm 8 · md 10 · lg 12 · xl 14 · 2xl 18   (การ์ดใช้ 2xl / ปุ่ม lg)
shadow-card:  0 1px 2px rgba(18,45,90,.05), 0 10px 30px -18px rgba(18,45,90,.22)
shadow-hover: 0 1px 2px rgba(18,45,90,.06), 0 16px 40px -18px rgba(18,45,90,.30)
```

## Spacing
สเกล 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 — การ์ด padding 20–24, ช่องว่างระหว่างการ์ด 16

## Buttons
- Primary: bg `--brand`, hover `--brand-strong`, text ขาว, radius lg, py 10 px 18, font 600, transition 150ms
- Secondary: bg surface, border `--border`, text `--muted`, hover bg `--subtle`
- Ghost/pill: nav ใช้ pill (active = `--brand-soft`/`--brand`)

## Cards & Components
- Card: surface + border `--border` + radius 2xl + shadow-card; hover row = bg `--subtle`
- Stat: eyebrow caption (muted) + ตัวเลขใหญ่ 30/700 tabular
- Badge สถานะ: pill เล็ก สีตาม semantic (บาง/soft bg)
- Input: border `--border`, radius lg, py 10, focus ring brand

## Motion
- transition มาตรฐาน `all .15s ease`; hover การ์ด: ยกเงา + เลื่อนขึ้น 1px
- respect `prefers-reduced-motion` (ปิด transform เมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว)

## Responsive
มือถือก่อน: stat 2 คอลัมน์ → เดสก์ท็อป 4; ตารางยุบเป็น card ในมือถือ; แตะง่าย ปุ่มใหญ่
