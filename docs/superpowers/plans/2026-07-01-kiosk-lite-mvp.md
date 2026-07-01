# KIOSK LITE MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบบันทึกและติดตามงานติดตั้ง KIOSK เวอร์ชัน LITE (ทีม 3 คน) แบบ 4 สเต็ป 2 มุมมอง (ออฟฟิศ/หน้างาน) ที่ใช้งานจริงได้

**Architecture:** Next.js (App Router) เป็น full-stack เดียว — React + Tailwind สำหรับ UI, Route Handlers เป็น REST API, Prisma → PostgreSQL. Auth ด้วย Auth.js (NextAuth v5) Credentials + JWT session ฝัง role. ไฟล์แนบเก็บ local disk. Data model ตั้งชื่อตาม TLS เพื่อขยายภายหลัง.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4 (CSS-first, no `tailwind.config`), Prisma 6, PostgreSQL 16, Auth.js (next-auth@5 beta), bcryptjs, Vitest 4, Zod 4

## Global Constraints

- Node.js ≥ 20
- Next.js 16 (App Router เท่านั้น, ไม่ใช้ Pages Router; route params เป็น `Promise` และต้อง `await`)
- Tailwind CSS v4 (CSS-first config: `@import "tailwindcss"` ใน globals.css, ไม่มีไฟล์ `tailwind.config.*`)
- TypeScript strict mode = true
- ทุก UI เป็นภาษาไทย; ฟอนต์ `IBM Plex Sans Thai`, สีแบรนด์ `#2F6BED`, พื้นหลัง `#F6F9FC`
- Database provider = `postgresql`; connection ผ่าน env `DATABASE_URL`
- Password hash ด้วย `bcryptjs` (pure JS, ไม่ต้อง compile native บน Windows)
- Test runner = Vitest; ทุก business logic ต้องมี unit test
- Commit หลังจบทุก Task ด้วย conventional commits (`feat:`, `test:`, `chore:`)
- Money = Prisma `Decimal`; วันที่ = `DateTime` (เก็บ UTC)
- Currency/qty แสดงผลด้วย `Intl.NumberFormat('th-TH')`

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` (Tailwind v4 uses `@tailwindcss/postcss`, no `tailwind.config`), `vitest.config.ts`, `.env.example`, `.env`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `formatBaht(n: number | string): string` (เช่น `1850000` → `"1,850,000"`), `formatQty(n: number): string`

- [ ] **Step 1: Scaffold Next.js app (into temp, then merge — root is non-empty)**

The project root already contains `docs/`, `uploads/`, `*.html`, `*.txt`, `support.js`, `.git`,
so `create-next-app` will refuse to scaffold in place. Scaffold into a temp dir with **no install**,
then move the generated files into the root without overwriting existing files.

Run (Git Bash):
```bash
TMP="$(mktemp -d)"
npx create-next-app@latest "$TMP/app" --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-npm --eslint --skip-install --yes --no-turbopack
# move generated files into project root, keep existing files
shopt -s dotglob
for f in "$TMP/app"/*; do
  base="$(basename "$f")"
  case "$base" in
    .git|.gitignore|README.md) ;;                 # keep our git + gitignore; merge README later
    *) cp -r "$f" "./$base" ;;
  esac
done
# merge next.js gitignore entries we may be missing (node_modules/.next already covered)
rm -rf "$TMP"
npm install
```
Expected: `src/app/`, `package.json`, `next.config.ts`, `tsconfig.json` (with `@/*` alias) exist in root;
existing `docs/`, `uploads/`, `.html`, `.txt` untouched; `node_modules/` installed.
> Note: `tsconfig.json` must contain `"paths": { "@/*": ["./src/*"] }` — verify after scaffold.

- [ ] **Step 2: Install dev/test deps**

Run:
```bash
npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom
npm i zod
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Write the failing test**

Create `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatBaht, formatQty } from './format'

describe('formatBaht', () => {
  it('formats a number with thousands separators', () => {
    expect(formatBaht(1850000)).toBe('1,850,000')
  })
  it('accepts a numeric string', () => {
    expect(formatBaht('420000')).toBe('420,000')
  })
})

describe('formatQty', () => {
  it('formats integer quantity', () => {
    expect(formatQty(2)).toBe('2')
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — `Cannot find module './format'`

- [ ] **Step 6: Implement**

Create `src/lib/format.ts`:
```ts
const nf = new Intl.NumberFormat('th-TH')

export function formatBaht(n: number | string): string {
  const value = typeof n === 'string' ? Number(n) : n
  return nf.format(value)
}

export function formatQty(n: number): string {
  return nf.format(n)
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- format`
Expected: PASS (2 files? just format — 3 tests pass)

- [ ] **Step 8: Set brand tokens in globals + layout**

In `src/app/globals.css` add after Tailwind directives:
```css
:root { --brand: #2F6BED; --bg: #F6F9FC; --ink: #12233B; }
body { background: var(--bg); color: var(--ink); font-family: 'IBM Plex Sans Thai', system-ui, sans-serif; }
```
In `src/app/layout.tsx` set `<html lang="th">` and add the Google Fonts `<link>` for `IBM+Plex+Sans+Thai` in `<head>` (คัดจาก mockup บรรทัด 11–13).

- [ ] **Step 9: Verify app runs**

Run: `npm run dev` then open `http://localhost:3000`
Expected: หน้า default โหลดได้ ไม่มี error. หยุด dev server.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, format util"
```

---

### Task 2: Database schema + Prisma

**Files:**
- Create: `docker-compose.yml`, `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Modify: `.env`, `.env.example`
- Test: `src/lib/prisma.test.ts`

**Interfaces:**
- Produces: singleton `prisma` (PrismaClient) จาก `src/lib/prisma.ts`
- Produces: Prisma models `User, Hospital, Job, SerialNumber, QcRecord, DeliveryRecord, InstallationRecord, HandoverRecord, InvoiceRecord, JobActivity, Attachment` และ enums `Role, JobStatus, SerialType, DeliveryStatus, InstallStatus, ActivityType, ActivityStatus`

- [ ] **Step 1: Install Prisma**

Run:
```bash
npm i -D prisma
npm i @prisma/client bcryptjs
npm i -D @types/bcryptjs
```

- [ ] **Step 2: Docker Compose for Postgres**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: kiosk
      POSTGRES_PASSWORD: kiosk
      POSTGRES_DB: kiosk
    ports:
      - "5432:5432"
    volumes:
      - kiosk_pgdata:/var/lib/postgresql/data
volumes:
  kiosk_pgdata:
```
Set in `.env` and `.env.example`:
```
DATABASE_URL="postgresql://kiosk:kiosk@localhost:5432/kiosk?schema=public"
```

- [ ] **Step 3: Write schema**

Create `prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { OFFICE FIELD ADMIN TECHNICIAN EXECUTIVE SYSTEM_ADMIN }
enum JobStatus { DATA_ENTRY PREPARING READY_TO_SHIP INSTALLING HANDED_OVER WAIT_INVOICE CLOSED PROBLEM CANCELLED }
enum SerialType { BMS KIOSK UPS MINI_PC SMART_CARD_READER PRINTER KEY_ID }
enum DeliveryStatus { PENDING SCHEDULED SHIPPING ARRIVED DELAYED PROBLEM }
enum InstallType { REMOTE ONSITE REMOTE_ONSITE }
enum InstallStatus { PENDING SCHEDULED INSTALLING DONE FAILED PROBLEM POSTPONED }
enum QcStatus { PENDING PASSED FAILED }
enum HandoverStatus { PENDING RECEIVED DELIVERED }
enum InvoiceStatus { PENDING ISSUED }
enum ActivityType { DELIVERY REMOTE ONSITE TRAINING }
enum ActivityStatus { PENDING SCHEDULED IN_PROGRESS DONE POSTPONED PROBLEM }

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  name         String
  role         Role     @default(FIELD)
  avatarColor  String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  adminJobs     Job[] @relation("AdminOwner")
  installerJobs Job[] @relation("InstallerOwner")
  activities    JobActivity[]
}

model Hospital {
  id           String  @id @default(cuid())
  name         String
  province     String
  healthRegion String?
  address      String?
  latitude     Float?
  longitude    Float?
  remark       String?
  jobs         Job[]
}

model Job {
  id                String    @id @default(cuid())
  jobCode           String    @unique
  sourceLot         String?
  hospital          Hospital  @relation(fields: [hospitalId], references: [id])
  hospitalId        String
  province          String
  productType       String
  productModel      String?
  color             String?
  quantity          Int       @default(1)
  salesAmount       Decimal   @default(0)
  contactName       String?
  contactPhone      String?
  contractNo        String?
  contractStartDate DateTime?
  contractEndDate   DateTime?
  deliveryDueDate   DateTime?
  currentStatus     JobStatus @default(DATA_ENTRY)
  adminOwner        User?     @relation("AdminOwner", fields: [adminOwnerId], references: [id])
  adminOwnerId      String?
  installerOwner    User?     @relation("InstallerOwner", fields: [installerOwnerId], references: [id])
  installerOwnerId  String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  serials       SerialNumber[]
  qc            QcRecord?
  delivery      DeliveryRecord?
  installation  InstallationRecord?
  handover      HandoverRecord?
  invoice       InvoiceRecord?
  activities    JobActivity[]
}

model SerialNumber {
  id         String     @id @default(cuid())
  job        Job        @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId      String
  serialType SerialType
  serialNo   String
  remark     String?
  @@index([jobId])
}

model QcRecord {
  id        String   @id @default(cuid())
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId     String   @unique
  status    QcStatus @default(PENDING)
  checklist Json     @default("[]")
  remark    String?
}

model DeliveryRecord {
  id            String         @id @default(cuid())
  job           Job            @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId         String         @unique
  shippedDate   DateTime?
  arrivedDate   DateTime?
  method        String?
  vehicle       String?
  trackingNo    String?
  estimatedCost Decimal?
  actualCost    Decimal?
  status        DeliveryStatus @default(PENDING)
  remark        String?
}

model InstallationRecord {
  id            String        @id @default(cuid())
  job           Job           @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId         String        @unique
  installType   InstallType   @default(REMOTE_ONSITE)
  remoteDate    DateTime?
  onsiteDate    DateTime?
  result        String?
  problem       String?
  solution      String?
  status        InstallStatus @default(PENDING)
}

model HandoverRecord {
  id                   String         @id @default(cuid())
  job                  Job            @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId                String         @unique
  checklistStatus      HandoverStatus @default(PENDING)
  checklistReceivedDate DateTime?
  handoverStatus       HandoverStatus @default(PENDING)
  handoverDate         DateTime?
  remark               String?
}

model InvoiceRecord {
  id            String        @id @default(cuid())
  job           Job           @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId         String        @unique
  status        InvoiceStatus @default(PENDING)
  invoiceDate   DateTime?
  invoiceNo     String?
  invoiceAmount Decimal?
  remark        String?
}

model JobActivity {
  id                String         @id @default(cuid())
  job               Job            @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId             String
  activityType      ActivityType
  activityDate      DateTime
  responsibleUser   User?          @relation(fields: [responsibleUserId], references: [id])
  responsibleUserId String?
  status            ActivityStatus @default(PENDING)
  remark            String?
  @@index([activityDate])
}

model Attachment {
  id           String   @id @default(cuid())
  refTable     String
  refId        String
  fileName     String
  fileType     String
  filePath     String
  fileSize     Int
  uploadedById String?
  uploadedAt   DateTime @default(now())
  @@index([refTable, refId])
}
```

- [ ] **Step 4: Start DB and migrate**

Run:
```bash
docker compose up -d db
npx prisma migrate dev --name init
```
Expected: migration `init` สร้างสำเร็จ, Prisma Client generated. (ถ้าไม่มี Docker: ตั้ง `DATABASE_URL` ชี้ Postgres อื่นก่อนรัน)

- [ ] **Step 5: Prisma singleton**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Write connectivity test**

Create `src/lib/prisma.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { prisma } from './prisma'

describe('prisma', () => {
  it('connects and runs a raw query', async () => {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    expect(rows).toBeTruthy()
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 7: Run test**

Run: `npm test -- prisma`
Expected: PASS (DB ต้องรันอยู่)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add Prisma schema, Postgres compose, prisma client"
```

---

### Task 3: Status & business logic helpers

**Files:**
- Create: `src/lib/status.ts`
- Test: `src/lib/status.test.ts`

**Interfaces:**
- Produces:
  - `STATUS_META: Record<JobStatus, { label: string; step: 1|2|3|4; color: string; bg: string }>`
  - `stepForStatus(status: JobStatus): 1|2|3|4`
  - `isOverdue(job: { deliveryDueDate: Date | null; currentStatus: JobStatus }, now: Date): boolean`
  - `statusLabel(status: JobStatus): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/status.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isOverdue, stepForStatus, statusLabel } from './status'

describe('stepForStatus', () => {
  it('maps INSTALLING to step 3', () => {
    expect(stepForStatus('INSTALLING')).toBe(3)
  })
  it('maps DATA_ENTRY to step 1', () => {
    expect(stepForStatus('DATA_ENTRY')).toBe(1)
  })
  it('maps WAIT_INVOICE to step 4', () => {
    expect(stepForStatus('WAIT_INVOICE')).toBe(4)
  })
})

describe('isOverdue', () => {
  const now = new Date('2026-07-15T00:00:00Z')
  it('is true when due date passed and job open', () => {
    expect(isOverdue({ deliveryDueDate: new Date('2026-07-10'), currentStatus: 'INSTALLING' }, now)).toBe(true)
  })
  it('is false when closed', () => {
    expect(isOverdue({ deliveryDueDate: new Date('2026-07-10'), currentStatus: 'CLOSED' }, now)).toBe(false)
  })
  it('is false when no due date', () => {
    expect(isOverdue({ deliveryDueDate: null, currentStatus: 'INSTALLING' }, now)).toBe(false)
  })
})

describe('statusLabel', () => {
  it('returns Thai label', () => {
    expect(statusLabel('INSTALLING')).toBe('กำลังติดตั้ง')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- status`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `src/lib/status.ts`:
```ts
import type { JobStatus } from '@prisma/client'

export const STATUS_META: Record<JobStatus, { label: string; step: 1 | 2 | 3 | 4; color: string; bg: string }> = {
  DATA_ENTRY:    { label: 'ข้อมูลตั้งต้น',   step: 1, color: '#5A6B82', bg: '#EDF0F4' },
  PREPARING:     { label: 'เตรียมสินค้า/QC', step: 2, color: '#9A6B10', bg: '#FAF0D8' },
  READY_TO_SHIP: { label: 'พร้อมจัดส่ง',     step: 2, color: '#157F4C', bg: '#E2F3EA' },
  INSTALLING:    { label: 'กำลังติดตั้ง',     step: 3, color: '#9A6B10', bg: '#FAF0D8' },
  HANDED_OVER:   { label: 'ส่งมอบแล้ว',      step: 4, color: '#157F4C', bg: '#E2F3EA' },
  WAIT_INVOICE:  { label: 'รอเปิดใบแจ้งหนี้', step: 4, color: '#1B5FD9', bg: '#E4EEFF' },
  CLOSED:        { label: 'ปิดงานแล้ว',      step: 4, color: '#157F4C', bg: '#E2F3EA' },
  PROBLEM:       { label: 'มีปัญหา',         step: 1, color: '#C13540', bg: '#FBE4E4' },
  CANCELLED:     { label: 'ยกเลิก',          step: 1, color: '#8492A6', bg: '#EEF1F5' },
}

export function stepForStatus(status: JobStatus): 1 | 2 | 3 | 4 {
  return STATUS_META[status].step
}

export function statusLabel(status: JobStatus): string {
  return STATUS_META[status].label
}

const OPEN_EXCLUDED: JobStatus[] = ['CLOSED', 'CANCELLED']

export function isOverdue(
  job: { deliveryDueDate: Date | null; currentStatus: JobStatus },
  now: Date,
): boolean {
  if (!job.deliveryDueDate) return false
  if (OPEN_EXCLUDED.includes(job.currentStatus)) return false
  return job.deliveryDueDate.getTime() < now.getTime()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- status`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: status metadata and overdue/step helpers"
```

---

### Task 4: Seed data from mockup

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` config + `db:seed` script)
- Test: `prisma/seed.test.ts`

**Interfaces:**
- Consumes: `prisma` client, `bcryptjs`
- Produces: seeded rows — 3 users (`office1`/จันทนา OFFICE, `field1`/ประเสริฐ FIELD, `field2`/อนุชา FIELD, password `1234`), 8 hospitals, ≥5 jobs, activities for the current week

- [ ] **Step 1: Add seed config**

In `package.json` add:
```json
"prisma": { "seed": "npx tsx prisma/seed.ts" },
```
and script `"db:seed": "npx tsx prisma/seed.ts"`. Install: `npm i -D tsx`.

- [ ] **Step 2: Write seed script**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.jobActivity.deleteMany()
  await prisma.serialNumber.deleteMany()
  await prisma.job.deleteMany()
  await prisma.hospital.deleteMany()
  await prisma.user.deleteMany()

  const pw = await bcrypt.hash('1234', 10)
  const office1 = await prisma.user.create({ data: { username: 'office1', passwordHash: pw, name: 'จันทนา', role: 'OFFICE', avatarColor: '#EAF1FF' } })
  const field1  = await prisma.user.create({ data: { username: 'field1', passwordHash: pw, name: 'ประเสริฐ', role: 'FIELD', avatarColor: '#E9EAFB' } })
  const field2  = await prisma.user.create({ data: { username: 'field2', passwordHash: pw, name: 'อนุชา', role: 'FIELD', avatarColor: '#DCF1F2' } })

  const hospData = [
    { name: 'โรงพยาบาลศรีนครินทร์', province: 'ขอนแก่น' },
    { name: 'โรงพยาบาลมหาราชนครเชียงใหม่', province: 'เชียงใหม่' },
    { name: 'โรงพยาบาลสงขลานครินทร์', province: 'สงขลา' },
    { name: 'โรงพยาบาลชลบุรี', province: 'ชลบุรี' },
    { name: 'โรงพยาบาลอุดรธานี', province: 'อุดรธานี' },
    { name: 'โรงพยาบาลสระบุรี', province: 'สระบุรี' },
    { name: 'โรงพยาบาลบุรีรัมย์', province: 'บุรีรัมย์' },
    { name: 'โรงพยาบาลนครพิงค์', province: 'เชียงใหม่' },
  ]
  const hosp: Record<string, string> = {}
  for (const h of hospData) { const r = await prisma.hospital.create({ data: h }); hosp[h.name] = r.id }

  const jobs = [
    { jobCode: 'JOB-2568-0142', hospital: 'โรงพยาบาลศรีนครินทร์', province: 'ขอนแก่น', productType: 'Kiosk HI-END', productModel: 'HE-2024 + Smart Card Reader', color: 'ขาว-น้ำเงิน', quantity: 2, salesAmount: 1850000, contactName: 'คุณกนกวรรณ (ฝ่าย IT)', contactPhone: '043-363-xxx', contractNo: 'PO-2568-0471', currentStatus: 'INSTALLING' as const, deliveryDueDate: new Date('2026-07-15'), adminOwnerId: office1.id, installerOwnerId: field2.id },
    { jobCode: 'JOB-2568-0138', hospital: 'โรงพยาบาลมหาราชนครเชียงใหม่', province: 'เชียงใหม่', productType: 'Kiosk HI-END', quantity: 3, salesAmount: 2640000, currentStatus: 'READY_TO_SHIP' as const, adminOwnerId: office1.id, installerOwnerId: field2.id },
    { jobCode: 'JOB-2568-0129', hospital: 'โรงพยาบาลอุดรธานี', province: 'อุดรธานี', productType: 'QR Payment', quantity: 6, salesAmount: 540000, currentStatus: 'PROBLEM' as const, deliveryDueDate: new Date('2026-06-20'), adminOwnerId: office1.id, installerOwnerId: field1.id },
    { jobCode: 'JOB-2568-0126', hospital: 'โรงพยาบาลสระบุรี', province: 'สระบุรี', productType: 'Mini Kiosk', quantity: 2, salesAmount: 760000, currentStatus: 'HANDED_OVER' as const, adminOwnerId: office1.id, installerOwnerId: field1.id },
    { jobCode: 'JOB-2568-0121', hospital: 'โรงพยาบาลบุรีรัมย์', province: 'บุรีรัมย์', productType: 'ชุดปิดสิทธิ', quantity: 4, salesAmount: 980000, currentStatus: 'CLOSED' as const, adminOwnerId: office1.id, installerOwnerId: field2.id },
  ]
  for (const j of jobs) {
    const { hospital, ...rest } = j
    await prisma.job.create({ data: { ...rest, hospitalId: hosp[hospital] } })
  }

  // activities this week (relative to a fixed seed date range around 2026-07-01)
  const j0142 = await prisma.job.findUniqueOrThrow({ where: { jobCode: 'JOB-2568-0142' } })
  await prisma.jobActivity.createMany({ data: [
    { jobId: j0142.id, activityType: 'DELIVERY', activityDate: new Date('2026-06-30T09:00:00Z'), responsibleUserId: field2.id, status: 'IN_PROGRESS' },
    { jobId: j0142.id, activityType: 'ONSITE', activityDate: new Date('2026-07-01T10:00:00Z'), responsibleUserId: field2.id, status: 'SCHEDULED' },
  ] })

  console.log('Seeded users, hospitals, jobs, activities.')
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Run seed**

Run: `npm run db:seed`
Expected: `Seeded users, hospitals, jobs, activities.`

- [ ] **Step 4: Write verification test**

Create `prisma/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('seed data', () => {
  it('has the office user and >=5 jobs', async () => {
    const office = await prisma.user.findUnique({ where: { username: 'office1' } })
    expect(office?.role).toBe('OFFICE')
    const jobs = await prisma.job.count()
    expect(jobs).toBeGreaterThanOrEqual(5)
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 5: Run test**

Run: `npm test -- seed`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: seed users, hospitals, jobs, activities from mockup"
```

---

### Task 5: Authentication (Auth.js Credentials + role)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/types/next-auth.d.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `prisma`, `bcryptjs`
- Produces:
  - `verifyCredentials(username: string, password: string): Promise<{ id: string; name: string; role: Role } | null>`
  - Auth.js handlers; session `user.role` available
  - middleware redirect: unauthenticated → `/login`

- [ ] **Step 1: Install Auth.js**

Run: `npm i next-auth@beta`

- [ ] **Step 2: Write the failing test**

Create `src/lib/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { verifyCredentials } from './auth'

describe('verifyCredentials', () => {
  it('returns user for correct password', async () => {
    const u = await verifyCredentials('office1', '1234')
    expect(u?.role).toBe('OFFICE')
  })
  it('returns null for wrong password', async () => {
    const u = await verifyCredentials('office1', 'wrong')
    expect(u).toBeNull()
  })
  it('returns null for unknown user', async () => {
    const u = await verifyCredentials('nobody', '1234')
    expect(u).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify fail**

Run: `npm test -- auth`
Expected: FAIL — module not found

- [ ] **Step 4: Implement auth core**

Create `src/lib/auth.ts`:
```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { Role } from '@prisma/client'
import { prisma } from './prisma'

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.active) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return { id: user.id, name: user.name, role: user.role as Role }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (c) => {
        const u = await verifyCredentials(String(c.username), String(c.password))
        return u ? { id: u.id, name: u.name, role: u.role } : null
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.role = (user as { role: Role }).role
      return token
    },
    session: ({ session, token }) => {
      if (session.user) (session.user as { role?: Role }).role = token.role as Role
      return session
    },
  },
})
```

Create `src/types/next-auth.d.ts`:
```ts
import type { Role } from '@prisma/client'
declare module 'next-auth' {
  interface Session { user: { id?: string; name?: string | null; role?: Role } }
}
declare module 'next-auth/jwt' {
  interface JWT { role?: Role }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- auth`
Expected: PASS (3 tests)

- [ ] **Step 6: Wire route handler + middleware**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

Create `src/middleware.ts`:
```ts
import { auth } from '@/lib/auth'

export default auth((req) => {
  const isAuthed = !!req.auth
  const { pathname } = req.nextUrl
  const isLogin = pathname.startsWith('/login')
  const isPublic = pathname.startsWith('/api/auth') || isLogin
  if (!isAuthed && !isPublic) {
    const url = new URL('/login', req.nextUrl.origin)
    return Response.redirect(url)
  }
})

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```
> Note: `@/*` path alias — ensure `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }` (create-next-app sets this when import-alias enabled; if not, add it).

- [ ] **Step 7: Build login page**

Create `src/app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn('credentials', { username, password, redirect: false })
    if (res?.error) { setErr('เข้าสู่ระบบไม่สำเร็จ ตรวจสอบชื่อผู้ใช้/รหัสผ่าน'); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-[#E7EDF4] rounded-2xl p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-9 h-9 rounded-lg bg-[#2F6BED] text-white grid place-items-center font-bold">K</span>
          <span className="font-bold text-lg">KIOSK</span>
        </div>
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1">ชื่อผู้ใช้</label>
        <input value={username} onChange={e => setU(e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 mb-4" />
        <label className="block text-sm font-semibold text-[#5A6B82] mb-1">รหัสผ่าน</label>
        <input type="password" value={password} onChange={e => setP(e.target.value)} className="w-full border border-[#D6DFEA] rounded-lg px-3 py-2.5 mb-4" />
        {err && <div className="text-[#C13540] text-sm mb-3">{err}</div>}
        <button className="w-full bg-[#2F6BED] text-white rounded-lg py-3 font-semibold">เข้าสู่ระบบ</button>
      </form>
    </div>
  )
}
```
Wrap the root layout children with `<SessionProvider>` — create `src/app/providers.tsx` (`'use client'` exporting `SessionProvider` from `next-auth/react`) and use it in `layout.tsx`.

Add to `.env`: `AUTH_SECRET="<run: npx auth secret>"`.

- [ ] **Step 8: Manual verify login**

Run: `npm run dev`, open `/`, ควร redirect ไป `/login`, ล็อกอิน `office1`/`1234` แล้วเข้า `/` ได้. หยุด server.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: Auth.js credentials login with role, middleware guard, login page"
```

---

### Task 6: Shared UI components

**Files:**
- Create: `src/components/StepTracker.tsx`, `src/components/StatusBadge.tsx`, `src/components/StatStrip.tsx`
- Create: `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

**Interfaces:**
- Consumes: `STATUS_META`, `stepForStatus` (Task 3)
- Produces:
  - `buildSteps(activeStep: 1|2|3|4): Array<{ n: string; label: string; state: 'done'|'active'|'todo' }>`
  - `<StepTracker active={1|2|3|4} />`, `<StatusBadge status={JobStatus} />`, `<StatStrip items={{label,value,warn?}[]} />`

- [ ] **Step 1: Write the failing test**

Create `src/lib/steps.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSteps } from './steps'

describe('buildSteps', () => {
  it('marks earlier steps done, current active, later todo', () => {
    const s = buildSteps(3)
    expect(s.map(x => x.state)).toEqual(['done', 'done', 'active', 'todo'])
    expect(s[0].label).toBe('ข้อมูลงาน')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- steps`
Expected: FAIL

- [ ] **Step 3: Implement steps + components**

Create `src/lib/steps.ts`:
```ts
export const STEP_LABELS = ['ข้อมูลงาน', 'สินค้า & QC', 'จัดส่ง & ติดตั้ง', 'ส่งมอบ & บิล'] as const

export function buildSteps(active: 1 | 2 | 3 | 4) {
  return STEP_LABELS.map((label, i) => {
    const n = i + 1
    const state = n < active ? 'done' : n === active ? 'active' : 'todo'
    return { n: String(n), label, state: state as 'done' | 'active' | 'todo' }
  })
}
```

Create `src/components/StepTracker.tsx`:
```tsx
import { buildSteps } from '@/lib/steps'

const numBg = { done: '#157F4C', active: '#2F6BED', todo: '#EAEFF6' }
const numFg = { done: '#fff', active: '#fff', todo: '#A2AEC0' }

export function StepTracker({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-start gap-0">
      {buildSteps(active).map((f) => (
        <div key={f.n} className="flex-1 flex flex-col items-center gap-2">
          <span className="w-10 h-10 rounded-full grid place-items-center font-bold" style={{ background: numBg[f.state], color: numFg[f.state] }}>{f.n}</span>
          <span className="text-sm font-semibold" style={{ color: f.state === 'todo' ? '#A2AEC0' : '#12233B' }}>{f.label}</span>
        </div>
      ))}
    </div>
  )
}
```

Create `src/components/StatusBadge.tsx`:
```tsx
import type { JobStatus } from '@prisma/client'
import { STATUS_META } from '@/lib/status'

export function StatusBadge({ status }: { status: JobStatus }) {
  const m = STATUS_META[status]
  return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: m.bg, color: m.color }}>{m.label}</span>
}
```

Create `src/components/StatStrip.tsx`:
```tsx
export function StatStrip({ items }: { items: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {items.map((s) => (
        <div key={s.label} className="bg-white border border-[#E7EDF4] rounded-2xl px-4 py-4">
          <div className="text-[13px] text-[#5A6B82] font-medium">{s.label}</div>
          <div className="text-4xl font-bold mt-1 tracking-tight" style={{ color: s.warn ? '#C13540' : '#12233B' }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- steps`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: shared StepTracker, StatusBadge, StatStrip components"
```

---

### Task 7: Dashboard queries + office home page `/`

**Files:**
- Create: `src/lib/dashboard.ts`, `src/app/api/dashboard/summary/route.ts`
- Create: `src/app/(office)/layout.tsx`, `src/app/(office)/page.tsx`, `src/components/JobRow.tsx`
- Test: `src/lib/dashboard.test.ts`

**Interfaces:**
- Consumes: `prisma`, `isOverdue`
- Produces:
  - `getSummary(now: Date): Promise<{ total: number; toShip: number; toHandover: number; overdue: number }>`
  - `getJobList(): Promise<Job[]>` (ordered by updatedAt desc, includes hospital)

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboard.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getSummary } from './dashboard'

describe('getSummary', () => {
  it('returns non-negative counts and detects overdue from seed', async () => {
    const s = await getSummary(new Date('2026-07-01T00:00:00Z'))
    expect(s.total).toBeGreaterThanOrEqual(5)
    expect(s.overdue).toBeGreaterThanOrEqual(1) // JOB-0129 due 2026-06-20, PROBLEM
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- dashboard`
Expected: FAIL

- [ ] **Step 3: Implement queries**

Create `src/lib/dashboard.ts`:
```ts
import { prisma } from './prisma'
import { isOverdue } from './status'

export async function getSummary(now: Date) {
  const jobs = await prisma.job.findMany({ select: { currentStatus: true, deliveryDueDate: true } })
  const total = jobs.length
  const toShip = jobs.filter(j => j.currentStatus === 'READY_TO_SHIP').length
  const toHandover = jobs.filter(j => j.currentStatus === 'HANDED_OVER' || j.currentStatus === 'WAIT_INVOICE').length
  const overdue = jobs.filter(j => isOverdue(j, now)).length
  return { total, toShip, toHandover, overdue }
}

export async function getJobList() {
  return prisma.job.findMany({ include: { hospital: true }, orderBy: { updatedAt: 'desc' } })
}
```

Create `src/app/api/dashboard/summary/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSummary } from '@/lib/dashboard'

export async function GET() {
  return NextResponse.json(await getSummary(new Date()))
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- dashboard`
Expected: PASS

- [ ] **Step 5: Build office layout + home page**

Create `src/app/(office)/layout.tsx` — top nav (โลโก้ K + "KIOSK", เมนู "งานทั้งหมด", ปุ่ม "＋ เพิ่มงาน" → `/jobs/new`, avatar). Server component; ดึง session ผ่าน `auth()` เพื่อโชว์ชื่อ/สั่ง signOut.

Create `src/components/JobRow.tsx`:
```tsx
import Link from 'next/link'
import type { Job, Hospital } from '@prisma/client'
import { StatusBadge } from './StatusBadge'
import { formatQty } from '@/lib/format'

export function JobRow({ job }: { job: Job & { hospital: Hospital } }) {
  return (
    <Link href={`/jobs/${job.id}`} className="grid grid-cols-[1.6fr_1.3fr_130px_90px] items-center px-5 py-3.5 border-t border-[#F1F5F9] hover:bg-[#FBFCFE]">
      <div>
        <div className="text-sm font-semibold">{job.hospital.name}</div>
        <div className="text-xs text-[#8492A6]">{job.jobCode} · {job.province}</div>
      </div>
      <div className="text-[13px] text-[#3C4A5E]">{job.productType} ×{formatQty(job.quantity)}</div>
      <div><StatusBadge status={job.currentStatus} /></div>
      <div className="text-right text-[12.5px] font-semibold text-[#2F6BED]">อัปเดต ›</div>
    </Link>
  )
}
```

Create `src/app/(office)/page.tsx` (server component):
```tsx
import { getSummary, getJobList } from '@/lib/dashboard'
import { StatStrip } from '@/components/StatStrip'
import { JobRow } from '@/components/JobRow'
import { formatQty } from '@/lib/format'

export default async function Home() {
  const now = new Date()
  const s = await getSummary(now)
  const jobs = await getJobList()
  const items = [
    { label: 'งานทั้งหมด', value: formatQty(s.total) },
    { label: 'พร้อมจัดส่ง', value: formatQty(s.toShip) },
    { label: 'รอส่งมอบ', value: formatQty(s.toHandover) },
    { label: 'เลยกำหนด', value: formatQty(s.overdue), warn: s.overdue > 0 },
  ]
  return (
    <div className="p-6 max-w-[1160px] mx-auto">
      <div className="mb-6"><StatStrip items={items} /></div>
      <div className="bg-white border border-[#E7EDF4] rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1.5 text-[15px] font-bold">รายการงาน</div>
        {jobs.map(j => <JobRow key={j.id} job={j} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Manual verify**

Run: `npm run dev`, ล็อกอิน, หน้า `/` แสดง stat strip (เลยกำหนดเป็นสีแดง) + รายการงาน. หยุด server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: dashboard summary query + office home page with job list"
```

---

### Task 8: Attachment upload

**Files:**
- Create: `src/lib/upload.ts`, `src/app/api/attachments/upload/route.ts`
- Modify: `.gitignore` (already ignores uploads), create `uploads/.gitkeep`
- Test: `src/lib/upload.test.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: `saveUpload(file: File, refTable: string, refId: string, userId?: string): Promise<Attachment>` — writes to `uploads/`, returns Attachment row. Path returned as `/uploads/<name>`.
- Produces: `POST /api/attachments/upload` (multipart: `file`, `refTable`, `refId`) → `{ id, filePath }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/upload.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { safeFileName } from './upload'

describe('safeFileName', () => {
  it('slugifies and keeps extension', () => {
    const n = safeFileName('รูป หน้างาน (1).JPG')
    expect(n.endsWith('.jpg')).toBe(true)
    expect(n).not.toContain(' ')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- upload`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/upload.ts`:
```ts
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from './prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export function safeFileName(original: string): string {
  const ext = (original.split('.').pop() || 'bin').toLowerCase()
  const base = original.replace(/\.[^.]+$/, '').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
  const stamp = Math.floor(performance.now() * 1000).toString(36)
  return `${base}-${stamp}.${ext}`
}

export async function saveUpload(file: File, refTable: string, refId: string, userId?: string) {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const name = safeFileName(file.name)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, name), buf)
  return prisma.attachment.create({
    data: { refTable, refId, fileName: file.name, fileType: file.type || 'application/octet-stream', filePath: `/uploads/${name}`, fileSize: buf.length, uploadedById: userId },
  })
}
```

Create `src/app/api/attachments/upload/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveUpload } from '@/lib/upload'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  const refTable = String(form.get('refTable') || '')
  const refId = String(form.get('refId') || '')
  if (!file || !refTable || !refId) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  const att = await saveUpload(file, refTable, refId, session.user.id)
  return NextResponse.json({ id: att.id, filePath: att.filePath })
}
```
> Note: serving files — add a simple `GET /api/attachments/[id]/route.ts` later if needed; for MVP images are referenced by `/uploads/...` served via a static route. Create `src/app/uploads/[...path]/route.ts` that streams the file, OR configure Next to serve `uploads` — implement streaming route:

Create `src/app/api/files/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const buf = await readFile(path.join(process.cwd(), att.filePath.replace(/^\//, '')))
  return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': att.fileType } })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- upload`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: attachment upload + file streaming route"
```

---

### Task 9: Job form (Step 1) — create/edit `/jobs/[id]` & `/jobs/new`

**Files:**
- Create: `src/lib/jobSchema.ts`, `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/route.ts`
- Create: `src/app/(office)/jobs/[id]/page.tsx`, `src/app/(office)/jobs/new/page.tsx`, `src/components/JobForm.tsx`
- Test: `src/lib/jobSchema.test.ts`, `src/app/api/jobs/jobs-api.test.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`
- Produces:
  - `jobInput` Zod schema; `parseJobInput(data): JobInput`
  - `GET/POST /api/jobs`, `GET/PUT /api/jobs/[id]`
  - `<JobForm job? hospitals users />` — client component posting to the API

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/jobSchema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { jobInput } from './jobSchema'

describe('jobInput', () => {
  it('requires jobCode and hospitalId', () => {
    const r = jobInput.safeParse({ productType: 'Kiosk HI-END', quantity: 2 })
    expect(r.success).toBe(false)
  })
  it('coerces salesAmount and quantity', () => {
    const r = jobInput.parse({ jobCode: 'J1', hospitalId: 'h1', province: 'ขอนแก่น', productType: 'Kiosk HI-END', quantity: '2', salesAmount: '1850000' })
    expect(r.quantity).toBe(2)
    expect(r.salesAmount).toBe(1850000)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- jobSchema`
Expected: FAIL

- [ ] **Step 3: Implement schema**

Create `src/lib/jobSchema.ts`:
```ts
import { z } from 'zod'

export const jobInput = z.object({
  jobCode: z.string().min(1),
  hospitalId: z.string().min(1),
  province: z.string().min(1),
  productType: z.string().min(1),
  productModel: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1),
  salesAmount: z.coerce.number().min(0).default(0),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contractNo: z.string().optional().nullable(),
  contractStartDate: z.coerce.date().optional().nullable(),
  contractEndDate: z.coerce.date().optional().nullable(),
  deliveryDueDate: z.coerce.date().optional().nullable(),
  adminOwnerId: z.string().optional().nullable(),
  installerOwnerId: z.string().optional().nullable(),
})
export type JobInput = z.infer<typeof jobInput>
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- jobSchema`
Expected: PASS

- [ ] **Step 5: Write API route test**

Create `src/app/api/jobs/jobs-api.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('job update persists', () => {
  it('updates quantity via prisma (integration proxy for PUT)', async () => {
    const job = await prisma.job.findFirstOrThrow()
    const updated = await prisma.job.update({ where: { id: job.id }, data: { quantity: job.quantity + 1 } })
    expect(updated.quantity).toBe(job.quantity + 1)
    await prisma.job.update({ where: { id: job.id }, data: { quantity: job.quantity } })
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 6: Implement API routes**

Create `src/app/api/jobs/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jobInput } from '@/lib/jobSchema'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')
  const jobs = await prisma.job.findMany({
    where: {
      ...(status ? { currentStatus: status as never } : {}),
      ...(q ? { OR: [{ jobCode: { contains: q } }, { hospital: { name: { contains: q } } }] } : {}),
    },
    include: { hospital: true }, orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = jobInput.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const job = await prisma.job.create({ data: parsed.data })
  return NextResponse.json(job, { status: 201 })
}
```

Create `src/app/api/jobs/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jobInput } from '@/lib/jobSchema'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, include: { hospital: true, serials: true, qc: true, delivery: true, installation: true, handover: true, invoice: true } })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const parsed = jobInput.partial().safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const job = await prisma.job.update({ where: { id }, data: parsed.data })
  return NextResponse.json(job)
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- jobs-api`
Expected: PASS

- [ ] **Step 8: Build JobForm + pages**

Create `src/components/JobForm.tsx` (client component): ฟอร์มตาม mockup "บันทึกข้อมูลงาน" (section ข้อมูลงาน + ผู้ติดต่อ & เอกสาร), มี `<StepTracker active={1} />` ด้านบน, ปุ่มบันทึกเรียก `fetch('/api/jobs' or '/api/jobs/[id]', {method})`. Fields ตาม `jobInput`. Dropdown โรงพยาบาล/ผู้รับผิดชอบจาก props. หลังบันทึกสำเร็จ `router.refresh()`.

Create `src/app/(office)/jobs/[id]/page.tsx` (server): ดึง job + hospitals + users ส่งเข้า `<JobForm>`.
Create `src/app/(office)/jobs/new/page.tsx` (server): ส่ง hospitals + users, `<JobForm>` โหมดสร้างใหม่.

- [ ] **Step 9: Manual verify**

Run dev: แก้ไขงาน #0142 แล้วกดบันทึก, ค่าเปลี่ยนจริง; สร้างงานใหม่ที่ `/jobs/new` แล้วปรากฏใน `/`. หยุด server.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: job create/edit form (step 1) with Zod-validated API"
```

---

### Task 10: Serial + QC (Step 2) `/jobs/[id]/qc`

**Files:**
- Create: `src/lib/serial.ts`, `src/app/api/jobs/[id]/serials/route.ts`, `src/app/api/jobs/[id]/qc/route.ts`
- Create: `src/app/(office)/jobs/[id]/qc/page.tsx`, `src/components/SerialQcForm.tsx`
- Test: `src/lib/serial.test.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: `findDuplicateSerial(serialNo: string, excludeJobId?: string): Promise<boolean>`; endpoints to add serial + save QC checklist; PATCH job status to `READY_TO_SHIP` when QC passed.

- [ ] **Step 1: Write the failing test**

Create `src/lib/serial.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizeSerial } from './serial'

describe('normalizeSerial', () => {
  it('uppercases and trims', () => {
    expect(normalizeSerial('  ksk-24a-00871 ')).toBe('KSK-24A-00871')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- serial`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/serial.ts`:
```ts
import { prisma } from './prisma'

export function normalizeSerial(s: string): string {
  return s.trim().toUpperCase()
}

export async function findDuplicateSerial(serialNo: string, excludeJobId?: string): Promise<boolean> {
  const norm = normalizeSerial(serialNo)
  const existing = await prisma.serialNumber.findFirst({
    where: { serialNo: norm, ...(excludeJobId ? { NOT: { jobId: excludeJobId } } : {}) },
  })
  return !!existing
}
```

Create `src/app/api/jobs/[id]/serials/route.ts`: POST `{ serialType, serialNo }` → ถ้า `findDuplicateSerial` true คืน 409 `{ error: 'duplicate serial' }`, ไม่งั้นสร้าง (เก็บ `normalizeSerial`).
Create `src/app/api/jobs/[id]/qc/route.ts`: PUT `{ status, checklist }` → upsert `QcRecord`; ถ้า `status === 'PASSED'` ให้ `prisma.job.update` set `currentStatus = 'READY_TO_SHIP'`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- serial`
Expected: PASS

- [ ] **Step 5: Build SerialQcForm + page**

Create `src/components/SerialQcForm.tsx` (client): รายการ S/N (7 ประเภทตาม mockup serialsRaw) + ปุ่มเพิ่ม, QC checklist (5 ข้อ) toggle ✓/!, ปุ่ม "QC ผ่าน → พร้อมจัดส่ง". แจ้ง error เมื่อ serial ซ้ำ.
Create `src/app/(office)/jobs/[id]/qc/page.tsx` (server): ดึง job.serials + qc.

- [ ] **Step 6: Manual verify**

เพิ่ม S/N ซ้ำ → เห็น error; QC ผ่าน → สถานะงานเป็น "พร้อมจัดส่ง". หยุด server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: serial number + QC (step 2) with duplicate detection"
```

---

### Task 11: Delivery & Installation (Step 3) `/jobs/[id]/delivery`

**Files:**
- Create: `src/app/api/jobs/[id]/delivery/route.ts`, `src/app/api/jobs/[id]/installation/route.ts`
- Create: `src/app/(office)/jobs/[id]/delivery/page.tsx`, `src/components/DeliveryForm.tsx`
- Test: `src/app/api/jobs/delivery-api.test.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`
- Produces: PUT delivery / installation (upsert 1:1). Saving `installation.status = INSTALLING` sets `job.currentStatus = 'INSTALLING'`; scheduling remote/onsite dates creates matching `JobActivity` rows.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/jobs/delivery-api.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

describe('delivery upsert', () => {
  it('creates then updates a delivery record 1:1', async () => {
    const job = await prisma.job.findFirstOrThrow()
    const up = await prisma.deliveryRecord.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, trackingNo: 'TRK-TEST', status: 'SHIPPING' },
      update: { trackingNo: 'TRK-TEST-2' },
    })
    expect(up.jobId).toBe(job.id)
    await prisma.deliveryRecord.deleteMany({ where: { jobId: job.id } })
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 2: Run to verify fail/pass**

Run: `npm test -- delivery-api`
Expected: PASS (validates schema relation; if delivery already seeded, adjust cleanup) — if FAIL due to existing record, wrap create/update accordingly.

- [ ] **Step 3: Implement API**

Create `src/app/api/jobs/[id]/delivery/route.ts`: PUT body (Zod) → `prisma.deliveryRecord.upsert`. Coerce dates/decimals.
Create `src/app/api/jobs/[id]/installation/route.ts`: PUT → upsert `installationRecord`; if `status === 'INSTALLING'` set job status; if `remoteDate`/`onsiteDate` provided, create `JobActivity` (type REMOTE/ONSITE) — dedupe by (jobId, activityType, activityDate).

- [ ] **Step 4: Build DeliveryForm + page**

Create `src/components/DeliveryForm.tsx` (client): 2 การ์ด "การจัดส่ง" + "Remote & ติดตั้งหน้างาน" ตาม mockup สเต็ป 3, `<StepTracker active={3} />`.
Create `src/app/(office)/jobs/[id]/delivery/page.tsx` (server).

- [ ] **Step 5: Manual verify**

บันทึกจัดส่ง + ตั้ง status INSTALLING → job เป็น "กำลังติดตั้ง"; ตั้งวัน onsite → มี activity เพิ่ม. หยุด server.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: delivery + installation (step 3) with activity scheduling"
```

---

### Task 12: Handover, Invoice & Close (Step 4) `/jobs/[id]/handover`

**Files:**
- Create: `src/lib/close.ts`, `src/app/api/jobs/[id]/handover/route.ts`, `src/app/api/jobs/[id]/invoice/route.ts`, `src/app/api/jobs/[id]/close/route.ts`
- Create: `src/app/(office)/jobs/[id]/handover/page.tsx`, `src/components/HandoverForm.tsx`
- Test: `src/lib/close.test.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: `canCloseJob(job): { ok: boolean; reasons: string[] }` (ต้อง handover DELIVERED + invoice ISSUED); PUT handover/invoice; POST close → set `CLOSED` เมื่อ `canCloseJob.ok`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/close.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canCloseJob } from './close'

describe('canCloseJob', () => {
  it('blocks when invoice not issued', () => {
    const r = canCloseJob({ handover: { handoverStatus: 'DELIVERED' }, invoice: { status: 'PENDING' } })
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('ยังไม่เปิดใบแจ้งหนี้')
  })
  it('allows when handover delivered and invoice issued', () => {
    const r = canCloseJob({ handover: { handoverStatus: 'DELIVERED' }, invoice: { status: 'ISSUED' } })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- close`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/close.ts`:
```ts
type CloseInput = {
  handover?: { handoverStatus: string } | null
  invoice?: { status: string } | null
}

export function canCloseJob(job: CloseInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (job.handover?.handoverStatus !== 'DELIVERED') reasons.push('ยังไม่ส่งมอบงาน')
  if (job.invoice?.status !== 'ISSUED') reasons.push('ยังไม่เปิดใบแจ้งหนี้')
  return { ok: reasons.length === 0, reasons }
}
```

Create the three routes: handover PUT (upsert), invoice PUT (upsert; if `status==='ISSUED'` set job `WAIT_INVOICE`→`CLOSED`? No — set job to `WAIT_INVOICE` when handed over, keep CLOSED only via close route). close POST → load job with handover+invoice, `canCloseJob`, if ok set `currentStatus='CLOSED'` else 400 with reasons.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- close`
Expected: PASS

- [ ] **Step 5: Build HandoverForm + page**

Create `src/components/HandoverForm.tsx` (client): การ์ด "Checklist & ส่งมอบงาน" + "ใบแจ้งหนี้" + right rail "ความพร้อมปิดงาน" (แสดง `canCloseJob.reasons`) + ปุ่ม "ปิดงาน" (disabled ถ้าไม่ ok), `<StepTracker active={4} />`.
Create `src/app/(office)/jobs/[id]/handover/page.tsx` (server).

- [ ] **Step 6: Manual verify**

เปิดใบแจ้งหนี้ + ส่งมอบ → ปุ่มปิดงานใช้ได้ → กดแล้ว status = "ปิดงานแล้ว". หยุด server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: handover + invoice + close job (step 4) with readiness gate"
```

---

### Task 13: Mobile — งานวันนี้ `/m` + บันทึกงาน `/m/jobs/[id]/report`

**Files:**
- Create: `src/lib/activities.ts`, `src/app/api/dashboard/activities/route.ts`
- Create: `src/app/m/layout.tsx`, `src/app/m/page.tsx`, `src/app/m/jobs/[id]/report/page.tsx`
- Create: `src/components/MobileTaskCard.tsx`, `src/components/QuickReportForm.tsx`
- Test: `src/lib/activities.test.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`
- Produces:
  - `getActivitiesBetween(from: Date, to: Date, userId?: string): Promise<...>` (include job+hospital)
  - `dayRange(d: Date): { from: Date; to: Date }` (00:00–23:59 ของวันนั้น)
  - Mobile pages + quick status update (PATCH job status) + photo upload (reuse Task 8)

- [ ] **Step 1: Write the failing test**

Create `src/lib/activities.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { dayRange } from './activities'

describe('dayRange', () => {
  it('returns start and end of the given day', () => {
    const { from, to } = dayRange(new Date('2026-07-01T13:45:00'))
    expect(from.getHours()).toBe(0)
    expect(to.getHours()).toBe(23)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- activities`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/activities.ts`:
```ts
import { prisma } from './prisma'

export function dayRange(d: Date): { from: Date; to: Date } {
  const from = new Date(d); from.setHours(0, 0, 0, 0)
  const to = new Date(d); to.setHours(23, 59, 59, 999)
  return { from, to }
}

export async function getActivitiesBetween(from: Date, to: Date, userId?: string) {
  return prisma.jobActivity.findMany({
    where: { activityDate: { gte: from, lte: to }, ...(userId ? { responsibleUserId: userId } : {}) },
    include: { job: { include: { hospital: true } } },
    orderBy: { activityDate: 'asc' },
  })
}
```

Create `src/app/api/dashboard/activities/route.ts`: GET `?from&to` → `getActivitiesBetween`, scope ตาม session (FIELD เห็นเฉพาะของตน).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- activities`
Expected: PASS

- [ ] **Step 5: Build mobile pages**

Create `src/app/m/layout.tsx`: กรอบมือถือ + bottom nav (งาน / ＋ / ฉัน) ตาม mockup.
Create `src/components/MobileTaskCard.tsx`: card เวลา + ประเภท + รพ. + ปุ่ม โทร/นำทาง/บันทึกงาน (link → report). ปุ่มโทรใช้ `tel:`; นำทางใช้ `https://www.google.com/maps/search/?api=1&query=<lat,lng or name>`.
Create `src/app/m/page.tsx` (server): header "สวัสดี, {ชื่อ}" + "งานวันนี้ N งาน" + list จาก `getActivitiesBetween(dayRange(now))` scoped to session user.
Create `src/components/QuickReportForm.tsx` (client): 3 ปุ่มสถานะใหญ่ (เสร็จ/ยังทำอยู่/ติดปัญหา) → PATCH `/api/jobs/[id]/status`; ถ่ายรูป `<input type="file" accept="image/*" capture="environment">` → upload; หมายเหตุ; ปุ่ม "บันทึก & ส่งให้ธุรการ".
Create `src/app/m/jobs/[id]/report/page.tsx` (server): โหลด job ส่งเข้า form.

- [ ] **Step 6: Manual verify (mobile viewport)**

เปิด `/m` ล็อกอินเป็น `field2`/`1234` → เห็นงานวันนี้; กดบันทึกงาน → เปลี่ยนสถานะ + แนบรูปได้. ตรวจด้วย DevTools responsive (iPhone). หยุด server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: mobile today-tasks + quick job report with photo"
```

---

### Task 14: Status PATCH endpoint + polish

**Files:**
- Create: `src/app/api/jobs/[id]/status/route.ts`
- Modify: office layout (signOut button), add `/jobs/[id]` sub-nav linking 4 steps
- Test: `src/lib/transition.test.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`
- Produces: `PATCH /api/jobs/[id]/status { status }`; `assertRole(session, roles)` guard helper in `src/lib/guard.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/transition.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isValidStatus } from './transition'

describe('isValidStatus', () => {
  it('accepts a known status', () => { expect(isValidStatus('INSTALLING')).toBe(true) })
  it('rejects garbage', () => { expect(isValidStatus('FOO')).toBe(false) })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- transition`
Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/transition.ts`:
```ts
import { STATUS_META } from './status'
import type { JobStatus } from '@prisma/client'

export function isValidStatus(s: string): s is JobStatus {
  return s in STATUS_META
}
```

Create `src/app/api/jobs/[id]/status/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidStatus } from '@/lib/transition'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()
  if (!isValidStatus(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  const job = await prisma.job.update({ where: { id }, data: { currentStatus: status } })
  return NextResponse.json(job)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- transition`
Expected: PASS

- [ ] **Step 5: Add step sub-nav + signOut**

In `src/app/(office)/jobs/[id]/page.tsx` layout: add compact 4-step nav linking to `/jobs/[id]`, `/qc`, `/delivery`, `/handover` (ตาม mockup pill tracker). Add signOut button in office layout header calling `signOut()`.

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: ทุก test ผ่าน

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: status PATCH endpoint, step sub-nav, signout"
```

---

### Task 15: README + final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Create `README.md` with: ภาพรวม, วิธีรัน (`docker compose up -d db`, `npx prisma migrate dev`, `npm run db:seed`, `npm run dev`), บัญชีทดสอบ (`office1`/`field2` รหัส `1234`), โครงสร้าง, roadmap ขยายไป TLS.

- [ ] **Step 2: Full smoke test**

Run: `npm run build` — expected: build ผ่านไม่มี type error.
Run: `npm test` — expected: ทุก test ผ่าน.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: add README with setup and test accounts"
```

---

## Self-Review

**Spec coverage (LITE scope):**
- Login + role → Task 5 ✅
- Job list + detail/edit → Task 7, 9 ✅
- Product/Serial + QC → Task 10 ✅
- Delivery + Installation → Task 11 ✅
- Handover + Invoice + Close → Task 12 ✅
- Dashboard (stat strip + list) → Task 7 ✅
- Mobile งานวันนี้ + บันทึกงาน (โทร/นำทาง/ถ่ายรูป) → Task 13 ✅
- Attachments → Task 8 ✅
- Overdue derivation → Task 3 ✅
- Seed from mockup → Task 4 ✅
- Deferred to TLS (Excel Import, Report/Export, Map/Calendar, Notification, AuditLog, multi-contact, Technician/Executive) → §8 ของ spec, ไม่อยู่ใน plan นี้ (ตั้งใจ) ✅

**Type consistency:** `JobStatus`/enum ใช้ค่าเดียวกันทุก task (จาก Prisma). `getSummary(now)`, `isOverdue(job, now)`, `canCloseJob(job)`, `findDuplicateSerial`, `dayRange` ชื่อ/พารามิเตอร์ตรงกันข้ามระหว่างนิยามและการเรียกใช้.

**Placeholder scan:** โค้ดที่มี test เป็นโค้ดจริงครบ; UI component บาง step อธิบายเป็นข้อความพร้อม field/behavior ชัดเจน (mockup เป็น reference ตรง) — ไม่มี "TBD/TODO".
