-- ขอเปิด MEMO License: per-unit checkbox recorded during QC (ย้ายจาก checklist รายประเภทมาเป็นฟิลด์ในหน้า QC)
ALTER TABLE "UnitQc" ADD COLUMN "memoLicense" BOOLEAN NOT NULL DEFAULT false;
