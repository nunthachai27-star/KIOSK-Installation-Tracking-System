-- วิธีจัดส่ง (SHIP_METHOD): เติมตัวเลือกเริ่มต้นจากค่าที่เคยใช้จริงใน DeliveryRecord
-- idempotent — ข้ามค่าที่มีอยู่แล้ว, ไม่แตะข้อมูลงานเดิม
INSERT INTO "MasterOption" ("id", "category", "value", "sortOrder", "active", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  'SHIP_METHOD',
  m.method,
  (row_number() OVER (ORDER BY m.method))::int,
  true,
  now(),
  now()
FROM (
  SELECT DISTINCT btrim("method") AS method
  FROM "DeliveryRecord"
  WHERE "method" IS NOT NULL AND btrim("method") <> ''
) m
WHERE NOT EXISTS (
  SELECT 1 FROM "MasterOption" o
  WHERE o."category" = 'SHIP_METHOD' AND o."value" = m.method
);
