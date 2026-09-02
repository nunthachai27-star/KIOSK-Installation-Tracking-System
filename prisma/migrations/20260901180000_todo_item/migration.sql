-- To-Do ส่วนตัวต่อผู้ใช้ (แยกต่างหาก ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS "TodoItem" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "done"      BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TodoItem_userId_idx" ON "TodoItem"("userId");
