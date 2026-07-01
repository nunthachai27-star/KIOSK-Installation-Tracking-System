# KIOSK Installation Tracking System (LITE MVP)

ระบบบันทึกและติดตามงานติดตั้ง KIOSK ตั้งแต่รับงาน → เตรียมสินค้า/QC → จัดส่ง/ติดตั้ง → ส่งมอบ/ใบแจ้งหนี้ → ปิดงาน
พร้อมมุมมองสำหรับ **Office** (จัดการงานแบบเดสก์ท็อป) และ **Field** (ทีมช่างหน้างานใช้บนมือถือ)

เวอร์ชันนี้เป็น **LITE MVP** — ครอบคลุม flow หลักของงานติดตั้งให้ใช้งานได้จริงก่อน ส่วนที่ซับซ้อนกว่านั้น (นำเข้า Excel, รายงาน/ส่งออก, แผนที่/ปฏิทิน, แจ้งเตือน ฯลฯ) จะทำในเฟสถัดไป (ดู [Roadmap](#roadmap--ขยายไป-tls))

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma v6](https://www.prisma.io/) ORM + PostgreSQL 16
- [Auth.js (next-auth v5 beta)](https://authjs.dev/) — credentials-based login, session-based role routing
- [Zod v4](https://zod.dev/) — schema validation
- [Vitest 4](https://vitest.dev/) + Testing Library — unit/integration tests

## Prerequisites

- Node.js ≥ 20
- Docker (สำหรับรัน PostgreSQL ผ่าน Docker Compose)
- npm

## Setup / วิธีรัน

1. **ตั้ง Database (Docker Compose)**

   ```bash
   docker compose up -d db
   ```

   Postgres จะรันที่ host port **5434** (map เข้า container port 5432) เพื่อไม่ชนกับ Postgres ที่อาจติดตั้งไว้ในเครื่องอยู่แล้วที่ 5432

2. **ตั้งค่า Environment Variables**

   คัดลอกไฟล์ตัวอย่างแล้วกำหนดค่า `AUTH_SECRET`:

   ```bash
   cp .env.example .env
   ```

   สร้างค่า `AUTH_SECRET` ด้วยคำสั่งใดคำสั่งหนึ่ง:

   ```bash
   npx auth secret
   # หรือ
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   `.env.example` มี `DATABASE_URL` ที่ชี้ไป port 5434 ให้อยู่แล้ว:

   ```
   DATABASE_URL="postgresql://kiosk:kiosk@localhost:5434/kiosk?schema=public"
   ```

3. **รัน Migration (+ seed อัตโนมัติ)**

   ```bash
   npx prisma migrate dev
   ```

   หรือถ้าต้องการ apply migration แบบไม่ interactive:

   ```bash
   npx prisma migrate deploy
   ```

   คำสั่ง `migrate dev` จะรัน seed ให้อัตโนมัติ (ตาม `prisma.seed` ใน `package.json`)

4. **Seed ข้อมูลใหม่ (ถ้าต้องการ reseed)**

   ```bash
   npm run db:seed
   ```

5. **รัน Dev Server**

   ```bash
   npm run dev
   ```

   เปิด [http://localhost:3000](http://localhost:3000)

## บัญชีทดสอบ (Test Accounts)

รหัสผ่านของทุกบัญชีคือ `1234`

| Username | Role   | เข้าใช้งานที่ |
|----------|--------|----------------|
| `office1` | OFFICE | `/` — เดสก์ท็อป (จัดการงาน, QC, จัดส่ง, ส่งมอบ) |
| `field1`  | FIELD  | `/m` — มือถือ (งานประจำวันของทีมช่าง) |
| `field2`  | FIELD  | `/m` — มือถือ (งานประจำวันของทีมช่าง) |

หมายเหตุ: ผู้ใช้ role `FIELD` ที่ login แล้วจะถูก middleware redirect ไปที่ `/m` โดยอัตโนมัติ (ไม่สามารถเข้าหน้าเดสก์ท็อปได้)

## มุมมองของระบบ (Views)

**Office (Desktop)** — จัดการงานตาม flow 4 ขั้นตอน:

- `/` — Dashboard: stat strip + รายการงาน
- `/jobs/[id]` — ขั้นตอนที่ 1: ข้อมูลงาน/สินค้า/Serial number
- `/jobs/[id]/qc` — ขั้นตอนที่ 2: ตรวจสอบคุณภาพ (QC)
- `/jobs/[id]/delivery` — ขั้นตอนที่ 3: จัดส่ง/ติดตั้ง
- `/jobs/[id]/handover` — ขั้นตอนที่ 4: ส่งมอบ/ใบแจ้งหนี้/ปิดงาน

**Field (Mobile)** — สำหรับทีมช่างหน้างาน:

- `/m` — งานของวันนี้ (โทรหาลูกค้า, นำทาง, ถ่ายรูปหน้างาน)
- `/m/jobs/[id]/report` — บันทึกผลงานหน้างาน

## โครงสร้างโปรเจกต์ (Project Structure)

```
src/
  app/
    (office)/            เดสก์ท็อป (dashboard, job detail 4 steps)
    m/                    มือถือสำหรับทีมช่าง (งานวันนี้, บันทึกงาน)
    api/                  Route handlers (jobs, dashboard, attachments, auth)
    login/                หน้า login
    middleware.ts          กันสิทธิ์ตาม role + redirect FIELD → /m
  components/             UI components ที่ใช้ร่วมกัน (forms, badges, nav ฯลฯ)
  lib/                    business logic ล้วน (status, transition, close, serial,
                            dashboard, activities, format, auth, upload ฯลฯ) — มี
                            unit test คู่กันแบบ *.test.ts เกือบทุกไฟล์
  types/                  ประกาศ type เสริม (เช่น next-auth session)
prisma/
  schema.prisma           data model ทั้งหมด
  migrations/              migration history
  seed.ts                  seed ข้อมูลตัวอย่าง (อ้างอิงจาก mockup)
docker-compose.yml         PostgreSQL 16 (host port 5434)
```

## การรัน Test

```bash
npm test          # รันทั้งหมดครั้งเดียว (vitest run)
npm run test:watch  # โหมด watch
```

Unit test ส่วนใหญ่อยู่คู่กับไฟล์ business logic ใน `src/lib/*.test.ts` และมี integration test ของ API ใน `src/app/api/jobs/*.test.ts`

## คำสั่งอื่น ๆ

```bash
npm run build     # production build (ต้องผ่านไม่มี type error)
npm run start     # รัน production server (หลัง build)
npm run lint      # ESLint
npm run db:seed   # reseed ฐานข้อมูล
```

## Security notes

ฟีเจอร์ด้าน security/authorization ต่อไปนี้ **ตั้งใจ defer ไปยัง TLS phase** เพื่อให้ LITE MVP ใช้งาน flow หลักได้เร็ว:

- **Status state-machine แบบเข้ม** — ปัจจุบันมีการตรวจสอบ transition พื้นฐาน (`src/lib/transition.ts`) แต่ยังไม่ใช่ state-machine ที่ enforce กฎทุกกรณีอย่างเคร่งครัด
- **Per-file ownership ACL แบบละเอียด** — ระบบ attachment ปัจจุบันผูกกับ role/job ownership ระดับ job ยังไม่มีการควบคุมสิทธิ์ราย-ไฟล์แบบละเอียด
- **รหัสผ่าน seed** — บัญชีทดสอบทั้งหมดใช้รหัสผ่าน `1234` ซึ่งเป็นค่าที่รู้กันทั่วไป **ใช้สำหรับ dev/testing เท่านั้น** ห้ามใช้ค่านี้ใน production
- Seed script (`prisma/seed.ts`) มีการป้องกันไว้แล้ว: จะ **ปฏิเสธการรันเมื่อ `NODE_ENV=production`** เว้นแต่ตั้ง `ALLOW_DESTRUCTIVE_SEED=true` อย่างชัดเจน (เพื่อกันการ wipe ข้อมูล production โดยไม่ตั้งใจ)

## Roadmap / ขยายไป TLS

รายการต่อไปนี้อยู่นอกขอบเขตของ LITE MVP และวางแผนไว้สำหรับเฟสถัดไป (Total Lifecycle System):

- **นำเข้าข้อมูลจาก Excel** — import งานจากไฟล์ `.xlsx` แทนการกรอกทีละงาน
- **รายงาน / ส่งออกข้อมูล (Report & Export)** — export เป็น Excel/PDF, รายงานสรุปตามช่วงเวลา/จังหวัด/สถานะ
- **ระบบแจ้งเตือน (Notification)** — แจ้งเตือนงานใกล้ครบกำหนด/overdue ผ่าน LINE/email
- **RBAC แบบเต็มรูปแบบ** — เพิ่ม role `ADMIN`, `TECHNICIAN`, `EXECUTIVE`, `SYSTEM_ADMIN` (มีอยู่ใน schema แล้วแต่ยังไม่ใช้งานจริงใน LITE) พร้อมสิทธิ์ที่ละเอียดขึ้น
- **Per-file ACL** — ควบคุมสิทธิ์การเข้าถึงไฟล์แนบเป็นรายไฟล์
- **Audit log** — บันทึกประวัติการเปลี่ยนแปลงข้อมูลอย่างละเอียด
- **Dashboard แบบแผนที่/ปฏิทินรายสัปดาห์** — แสดงงานบนแผนที่ตามพิกัดโรงพยาบาล และมุมมองปฏิทิน/สัปดาห์
- **Multi-contact ต่อโรงพยาบาล/งาน** — รองรับผู้ติดต่อหลายคนต่องาน
