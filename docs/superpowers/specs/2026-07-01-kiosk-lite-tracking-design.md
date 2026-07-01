# KIOSK Installation Tracking System — LITE MVP Design

**วันที่:** 2026-07-01
**สถานะ:** อนุมัติ (design)
**ขอบเขต:** LITE MVP ก่อน แล้วขยายไป TLS เต็มภายหลัง

---

## 1. บทนำ & เป้าหมาย

พัฒนา **ระบบบันทึกและติดตามงานติดตั้ง KIOSK** เวอร์ชัน LITE สำหรับทีม 3 คน โดย
ยุบกระบวนการทำงานเดิม (Excel หลายชีต / 15 แท็บ) ให้เหลือ **4 สเต็ป** และ **2 มุมมอง**
(ออฟฟิศ / หน้างาน) ตาม mockup `KIOSK Tracking Screens.dc.html`

Design นี้ยึด TLS (`KIOSK Installation Tracking System.txt`) เป็นทิศทางระยะยาว แต่ทำ
เฉพาะส่วนที่จำเป็นก่อน โดย **ออกแบบ data model และ enum ให้ขยายไป TLS ได้โดยไม่ต้องรื้อ**

### สิ่งที่ตัดสินใจแล้ว
- **ขอบเขต:** LITE ก่อน → โตไป TLS
- **Stack:** Next.js (App Router, TypeScript) + Prisma + PostgreSQL
- **Auth:** Login username/password + role (OFFICE / FIELD), RBAC-ready
- **ข้อมูลตั้งต้น:** seed ตัวอย่างจาก mockup; Excel Import ทำภายหลัง

---

## 2. สถาปัตยกรรม

```
Next.js 15 (App Router, TypeScript)
├─ Frontend : React Server/Client Components + Tailwind CSS (responsive)
├─ API      : Route Handlers (/app/api/*) — REST ตาม TLS §14
├─ ORM      : Prisma → PostgreSQL
├─ Auth     : NextAuth (Credentials provider) + JWT session (role ใน token)
├─ Files    : อัปโหลดลง /uploads (local disk) — เผื่อย้าย S3/MinIO ภายหลัง
└─ Deploy   : Docker Compose (app + postgres)
```

- **Dev database:** PostgreSQL ผ่าน Docker Compose (`docker compose up db`). หากเครื่อง dev
  ไม่มี Docker สามารถชี้ `DATABASE_URL` ไปยัง Postgres อื่น หรือใช้ SQLite ชั่วคราวได้
  (Prisma schema เขียนแบบ provider-agnostic เท่าที่เป็นไปได้; ค่า default = postgres)
- **ภาษา:** UI ภาษาไทยทั้งหมด, ฟอนต์ IBM Plex Sans Thai / Anuphan ตาม mockup
- **สไตล์:** สีหลัก `#2F6BED`, พื้นหลัง `#F6F9FC` — คง design token จาก mockup

---

## 3. Data Model (Prisma)

ตั้งชื่อและโครงตาม TLS §8–9 เพื่อขยายง่าย. ตารางที่ทำใน LITE MVP:

### 3.1 `User`
| field | type | หมายเหตุ |
|---|---|---|
| id | String (cuid) | PK |
| username | String @unique | |
| passwordHash | String | bcrypt |
| name | String | ชื่อแสดงผล (เช่น "จันทนา") |
| role | Role (enum) | `OFFICE` \| `FIELD` (เผื่อ `ADMIN`,`TECHNICIAN`,`EXECUTIVE`,`SYSTEM_ADMIN`) |
| avatarColor | String? | สีวงกลม avatar |
| active | Boolean @default(true) | |
| createdAt/updatedAt | DateTime | |

### 3.2 `Hospital`
| field | type | หมายเหตุ |
|---|---|---|
| id | String | PK |
| name | String | เช่น "โรงพยาบาลศรีนครินทร์" |
| province | String | จังหวัด |
| healthRegion | String? | เขตสุขภาพ (เผื่อ TLS) |
| address | String? | |
| latitude / longitude | Float? | สำหรับปุ่มนำทางมือถือ |
| remark | String? | |

### 3.3 `Job` (แกนกลาง — installation_jobs)
| field | type | หมายเหตุ |
|---|---|---|
| id | String | PK |
| jobCode | String @unique | เช่น "JOB-2568-0142" (แสดงย่อ "#0142") |
| sourceLot | String? | อ้างอิงข้อมูลเดิม |
| hospitalId | String → Hospital | |
| province | String | denormalize เพื่อค้นหา/filter เร็ว |
| productType | String | Kiosk HI-END, Mini Kiosk, QR Payment, ... |
| productModel | String? | รุ่น/อุปกรณ์เสริม |
| color | String? | |
| quantity | Int | |
| salesAmount | Decimal | ยอดขาย |
| contactName | String? | ผู้ติดต่อหลัก |
| contactPhone | String? | เบอร์โทร |
| contractNo | String? | เลขสัญญา/PO |
| contractStartDate | DateTime? | |
| contractEndDate | DateTime? | |
| deliveryDueDate | DateTime? | กำหนดส่งมอบ (ใช้คำนวณ overdue) |
| currentStatus | JobStatus (enum) | ดู §5 |
| adminOwnerId | String? → User | ผู้รับผิดชอบฝั่งออฟฟิศ |
| installerOwnerId | String? → User | ผู้รับผิดชอบหน้างาน |
| createdAt/updatedAt | DateTime | |

### 3.4 ตารางรายละเอียดตามสเต็ป (1:1 หรือ 1:N กับ Job)
- **`SerialNumber`** (1:N) — `jobId`, `serialType` (enum: BMS, KIOSK, UPS, MINI_PC, SMART_CARD_READER, PRINTER, KEY_ID), `serialNo`, `photoAttachmentId?`, `remark?`
- **`QcRecord`** (1:1) — `jobId`, `status` (รอ/ผ่าน/ไม่ผ่าน), `checklist` (JSON: [{label, ok}]), `remark?`
- **`DeliveryRecord`** (1:1) — `jobId`, `shippedDate?`, `arrivedDate?`, `method?`, `vehicle?`, `trackingNo?`, `estimatedCost?`, `actualCost?`, `status` (enum), `remark?`
- **`InstallationRecord`** (1:1) — `jobId`, `installType` (Remote/Onsite/Remote+Onsite), `remoteDate?`, `onsiteDate?`, `remoteStaffId?`, `onsiteStaffId?`, `result?`, `problem?`, `solution?`, `status` (enum)
- **`HandoverRecord`** (1:1) — `jobId`, `checklistStatus`, `checklistReceivedDate?`, `handoverStatus`, `handoverDate?`, `remark?`
- **`InvoiceRecord`** (1:1) — `jobId`, `status` (รอเปิด/เปิดแล้ว), `invoiceDate?`, `invoiceNo?`, `invoiceAmount?`, `remark?`

### 3.5 `JobActivity` (เครื่องยนต์ Dashboard — TLS §13)
| field | type | หมายเหตุ |
|---|---|---|
| id | String | PK |
| jobId | String → Job | |
| activityType | enum | ส่งของ, Remote, ติดตั้งหน้างาน, อบรม, ... |
| activityDate | DateTime | ใช้ query "วันนี้/สัปดาห์นี้" |
| responsibleUserId | String? → User | |
| status | ActivityStatus (enum) | รอ/นัดแล้ว/กำลังทำ/เสร็จ/เลื่อน/ติดปัญหา |
| remark | String? | |

### 3.6 `Attachment`
`id`, `refTable` (String), `refId` (String), `fileName`, `fileType`, `filePath`, `fileSize`,
`uploadedById → User`, `uploadedAt` — ใช้เก็บรูปสินค้า/หน้างาน/เอกสาร

> **ยังไม่ทำใน MVP (เผื่อ TLS):** `AuditLog`, `HospitalContact` (หลายผู้ติดต่อ), `Contract`
> แยก, `TrainingRecord` แยก, `IssueLog` แยก, `ImportBatch`. Timeline ทำแบบ derive จาก
> records + `updatedAt` ไปก่อน

---

## 4. หน้าจอ & Routes

### 4.1 Desktop (มุมมอง OFFICE)
| Route | หน้าจอ (mockup) |
|---|---|
| `/login` | เข้าสู่ระบบ |
| `/` | ศูนย์รวมงาน — stat strip (4 การ์ด) + งานเด่น (4-step tracker) + รายการงาน |
| `/jobs/[id]` | บันทึกข้อมูลงาน (สเต็ป 1) — ข้อมูลงาน + ผู้ติดต่อ&เอกสาร + right rail |
| `/jobs/[id]/delivery` | จัดส่ง & ติดตั้ง (สเต็ป 3) |
| `/jobs/[id]/handover` | ส่งมอบ & ใบแจ้งหนี้ (สเต็ป 4) + ความพร้อมปิดงาน |
| `/jobs/new` | เพิ่มงานใหม่ (ใช้ฟอร์มเดียวกับ `/jobs/[id]`) |

*(สเต็ป 2 "สินค้า & QC" = section ภายใน `/jobs/[id]` หรือ `/jobs/[id]/qc` — ทำเป็นฟอร์ม
S/N + QC checklist)*

### 4.2 Mobile (มุมมอง FIELD)
| Route | หน้าจอ (mockup) |
|---|---|
| `/m` | งานวันนี้ — card list + bottom nav |
| `/m/jobs/[id]/report` | บันทึกงาน (สเต็ปเดียว: เลือกสถานะ + ถ่ายรูป + หมายเหตุ + ส่งให้ธุรการ) |

### 4.3 หลัก UI
- Component responsive ตัวเดียวให้มากที่สุด; แยก layout เฉพาะมือถือที่ต่างจริง (bottom nav, card)
- คงสี/สถานะ/badge ตาม `renderVals()` ใน mockup (สี tint ตาม type)
- Mobile: ปุ่มใหญ่, dropdown แทนพิมพ์, รองรับถ่ายรูปจากกล้อง (`<input capture>`)

---

## 5. Workflow สถานะงาน

### `JobStatus` enum (LITE ใช้ subset, เก็บเต็มเผื่อ TLS)
```
DATA_ENTRY      ข้อมูลตั้งต้น
PREPARING       เตรียมสินค้า / QC
READY_TO_SHIP   พร้อมจัดส่ง
INSTALLING      กำลังติดตั้ง
HANDED_OVER     ส่งมอบแล้ว
WAIT_INVOICE    รอเปิดใบแจ้งหนี้
CLOSED          ปิดงาน
PROBLEM         มีปัญหารอแก้ไข
CANCELLED       ยกเลิก
```

- แม็ป 9 สถานะนี้เข้ากับ 4 สเต็ปใน tracker (ข้อมูลงาน / สินค้า&QC / จัดส่ง&ติดตั้ง / ส่งมอบ&บิล)
- **"เลยกำหนด" (overdue)** = derived: `deliveryDueDate < today && status != CLOSED/CANCELLED`
- ปุ่ม "ปิดงาน" ใช้ได้เมื่อ Invoice เปิดแล้ว (ตาม mockup checklist "ความพร้อมปิดงาน")

---

## 6. Auth & RBAC

- Login: username/password → bcrypt verify → NextAuth JWT session (role ฝังใน token)
- **OFFICE:** เห็น/แก้ทุกงาน, จัดการสเต็ป 1, 2, 4, ปิดงาน
- **FIELD:** เห็นงานที่ตัวเองเป็น installerOwner, อัปเดตสเต็ป 3 (จัดส่ง/ติดตั้ง) จากมือถือ, ส่งกลับให้ธุรการ
- Middleware ตรวจ role ต่อ route/ต่อ API; กันเข้าถึงข้ามสิทธิ์
- `Role` enum ขยายได้ (ADMIN/TECHNICIAN/EXECUTIVE/SYSTEM_ADMIN) โดยไม่รื้อโครง

---

## 7. API (Route Handlers — subset ของ TLS §14)

```
POST /api/auth/[...nextauth]        (NextAuth)
GET  /api/jobs            ?status=&province=&q=
POST /api/jobs
GET  /api/jobs/{id}
PUT  /api/jobs/{id}
PATCH /api/jobs/{id}/status
POST /api/jobs/{id}/serials
POST /api/jobs/{id}/qc
PUT  /api/jobs/{id}/delivery
PUT  /api/jobs/{id}/installation
PUT  /api/jobs/{id}/handover
PUT  /api/jobs/{id}/invoice
GET  /api/dashboard/summary          (stat strip)
GET  /api/dashboard/activities       ?from=&to=  (งานวันนี้/สัปดาห์นี้)
POST /api/attachments/upload
```

---

## 8. เส้นทางขยายไป TLS (ไม่รื้อของเดิม)
เพิ่มเป็น module ใหม่บนโครงเดิม: Excel Import (`ImportBatch`), Report/Export (Excel/PDF),
Weekly Dashboard เต็ม (Calendar/Table/Map View), Notification/Alert, Technician/Executive
role, AuditLog, HospitalContact หลายคน, TrainingRecord/IssueLog แยกตาราง

---

## 9. Testing
- **Unit (Vitest):** business logic — คำนวณ overdue, การเปลี่ยนสถานะ, dashboard query,
  ตรวจ Serial Number ซ้ำ, RBAC guard
- **TDD ราย slice** ตอน implement (test-driven-development)
- ตรวจ responsive ด้วยการรันจริง (Playwright/manual) เทียบกับ mockup

---

## 10. โครงโปรเจกต์ (คร่าว)
```
/
├─ prisma/schema.prisma, seed.ts
├─ src/app/            (routes ตาม §4)
│  ├─ (office)/…       desktop
│  ├─ m/…              mobile
│  └─ api/…
├─ src/components/     UI ที่ใช้ซ้ำ (StepTracker, StatusBadge, JobCard, …)
├─ src/lib/            prisma client, auth, dashboard queries
├─ uploads/            ไฟล์แนบ
├─ docker-compose.yml
└─ docs/superpowers/specs/…
```

---

## 11. Out of Scope (LITE MVP)
ระบบบัญชีเต็ม, Stock/Inventory, GPS Tracking, Native App, อนุมัติหลายระดับ, เชื่อม HOSxP,
Excel Import, Report Export, Map View, Notification (Email/LINE), AuditLog เต็ม
— ทั้งหมดอยู่ใน roadmap ขยายภายหลัง
