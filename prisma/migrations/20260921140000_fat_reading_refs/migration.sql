-- เพิ่มคอลัมน์เก็บช่วงปกติ+สถานะต่อค่า (เครื่องส่ง _n/_s มาให้) — เพิ่มแบบไม่กระทบข้อมูลเดิม
ALTER TABLE "FatReading" ADD COLUMN IF NOT EXISTS "refs" JSONB;
