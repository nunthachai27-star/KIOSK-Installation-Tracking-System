-- คู่มือ — ตารางใหม่แยก ไม่กระทบข้อมูลเดิม (ไฟล์แนบใช้ Attachment refTable='Manual')
CREATE TABLE IF NOT EXISTS "Manual" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "category"    TEXT,
  "linkUrl"     TEXT,
  "token"       TEXT NOT NULL,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Manual_token_key" ON "Manual"("token");
