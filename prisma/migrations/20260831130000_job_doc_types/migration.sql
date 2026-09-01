-- ชนิดเอกสารงาน (แก้ไขได้ในตั้งค่า) — seed ค่าเริ่มต้นลง MasterOption (idempotent)
INSERT INTO "MasterOption" ("id","category","value","sortOrder","updatedAt") VALUES
  ('jdt_contract',  'JOB_DOC_TYPE', 'สัญญา / PO',   1, CURRENT_TIMESTAMP),
  ('jdt_quotation', 'JOB_DOC_TYPE', 'ใบเสนอราคา',   2, CURRENT_TIMESTAMP),
  ('jdt_delivery',  'JOB_DOC_TYPE', 'ใบส่งของ',     3, CURRENT_TIMESTAMP),
  ('jdt_receipt',   'JOB_DOC_TYPE', 'ใบเสร็จ/ภาษี', 4, CURRENT_TIMESTAMP),
  ('jdt_other',     'JOB_DOC_TYPE', 'อื่นๆ',        5, CURRENT_TIMESTAMP)
ON CONFLICT ("category","value") DO NOTHING;
