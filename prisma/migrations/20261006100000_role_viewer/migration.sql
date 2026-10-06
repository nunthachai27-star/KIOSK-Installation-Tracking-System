-- role ผู้ชม (read-only) — ดูได้ทุกหน้า แก้/ลบไม่ได้
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';
