-- โชว์เคสโปรดัก Kiosk + ผู้สนใจ (leads). Additive, idempotent. ไม่แตะตารางอื่น.
CREATE TABLE IF NOT EXISTS "KioskProduct" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "tagline"    TEXT,
  "category"   TEXT,
  "priceLabel" TEXT,
  "priceNote"  TEXT,
  "features"   TEXT,
  "specs"      TEXT,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KioskProduct_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KioskProduct_sortOrder_idx" ON "KioskProduct"("sortOrder");

CREATE TABLE IF NOT EXISTS "KioskLead" (
  "id"          TEXT NOT NULL,
  "productId"   TEXT,
  "productName" TEXT,
  "hospital"    TEXT NOT NULL,
  "contact"     TEXT,
  "phone"       TEXT,
  "email"       TEXT,
  "note"        TEXT,
  "ip"          TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KioskLead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KioskLead_createdAt_idx" ON "KioskLead"("createdAt");
CREATE INDEX IF NOT EXISTS "KioskLead_ip_createdAt_idx" ON "KioskLead"("ip", "createdAt");

-- seed 7 รุ่น (ข้อมูลจากโบรชัวร์) — คงไว้ถ้ามีอยู่แล้ว
INSERT INTO "KioskProduct" ("id","name","tagline","category","priceLabel","priceNote","features","specs","sortOrder","updatedAt") VALUES
('start-smart-plus','Smart Hospital Kiosk — Start Smart Plus','ส่งตรวจ + ปิดสิทธิ สปสช. + ชำระเงิน · เริ่มใช้ได้ทันที','Smart Hospital Kiosk','79,000 บาท','รวม VAT · ยังไม่รวมขนส่ง+Remote · ค่าบริการรายปี 5,000/ตู้',
 E'ลงทะเบียนผู้ป่วยใหม่ (New HN)\nอ่านบัตรประชาชน / ตรวจสอบสิทธิ\nเลือกแผนก / ส่งตรวจได้ทันที\nปิดสิทธิ สปสช. และชำระเงิน\nพิมพ์ใบรับบริการอัตโนมัติ\nรองรับ One Stop Service สูงสุด 5 จุด\nปิดสิทธิผ่าน API NHSO Endpoint for Single Claim\nตรวจสอบสิทธิประกันชีวิตผ่าน iClaim API / MOPH Refer\nลดคิวห้องบัตร+การเงิน 30–60%',
 E'จอ Touch Screen 21.5"\nSmart Card Reader\nPrinter Thermal\nWebcam\nUPS สำรองไฟ',10,CURRENT_TIMESTAMP),
('start-smart','Smart Hospital Kiosk — Start Smart','ลดคิวผู้ป่วย เพิ่มความเร็วบริการ เริ่มใช้ได้ทันที','Smart Hospital Kiosk','79,000 บาท','รวม VAT · ยังไม่รวมขนส่ง+Remote · พร้อมส่ง Remote ติดตั้งไว',
 E'ลงทะเบียนผู้ป่วยใหม่ (New HN)\nอ่านบัตรประชาชน / ตรวจสอบสิทธิ\nเลือกแผนก / ส่งตรวจได้ทันที\nรองรับ Lab / X-Ray ล่วงหน้า\nพิมพ์ใบรับบริการอัตโนมัติ\nรองรับ One Stop Service สูงสุด 5 จุด\nเชื่อม HOSxP ได้ทันที\nตรวจสอบสิทธิ สปสช. / iClaim API / MOPH Refer\nลดคิวหน้าห้องบัตร 30–60%',
 E'จอ Touch Screen 21.5"\nSmart Card Reader\nPrinter Thermal\nWebcam\nUPS สำรองไฟ',20,CURRENT_TIMESTAMP),
('smart-standard','Smart Hospital Kiosk (ส่งตรวจ)','Printer Thermal + Authen Code — Standard / Hi-End','Smart Hospital Kiosk','172,000 / 230,000 บาท','Standard (จอ 32") 172,000 · Hi-End 230,000 · รวม VAT ยังไม่รวมขนส่ง+Remote',
 E'ลงทะเบียนผู้ป่วยใหม่ (New HN)\nอ่านบัตร/กรอกเลขบัตร ตรวจสอบสิทธิ สปสช.\nเลือกจุดบริการ / ส่งตรวจ ทั้งนัดและไม่นัด\nยืนยันสั่ง Lab / X-Ray ล่วงหน้า\nพิมพ์เอกสารตามฟอร์มโรงพยาบาล\nมีเสียงแนะนำการใช้งาน\nตรวจสอบสิทธิประกันชีวิตผ่าน iClaim API\nเปิดเผยประวัติ (PHR) / ส่งตรวจผ่าน MOPH Refer',
 E'จอ Touch Screen 32" (Standard)\nPrinter Thermal\nSmart Card Reader\nUPS 1000VA/500W\nWebcam',30,CURRENT_TIMESTAMP),
('duo','Duo Smart Kiosk','ตู้ส่งตรวจ พร้อมเครื่องชั่งน้ำหนัก + วัดส่วนสูง','Smart Hospital Kiosk','172,000 บาท','ราคารวม VAT · ยังไม่รวมขนส่ง+Remote',
 E'ลงทะเบียนผู้ป่วยใหม่ (New HN)\nอ่านบัตร/กรอกเลขบัตร ตรวจสอบสิทธิ สปสช.\nเลือกจุดบริการ / ส่งตรวจ ทั้งนัดและไม่นัด\nยืนยันสั่ง Lab / X-Ray ล่วงหน้า\nพิมพ์เอกสารตามฟอร์มโรงพยาบาล\nมีเสียงแนะนำการใช้งาน\niClaim API / PHR / MOPH Refer\nส่งค่าน้ำหนัก-ส่วนสูงเข้า HOSxP',
 E'จอ Touch Screen 23.5"\nPrinter Thermal\nSmart Card Reader\nUPS 1000VA/500W\nWebcam\nเครื่องชั่งน้ำหนัก\nเครื่องวัดส่วนสูง',40,CURRENT_TIMESTAMP),
('mini-checkin','BMS Mini Kiosk (ส่งตรวจอัตโนมัติ)','ส่งตรวจ + ขอ AuthenCode · บน Tablet Android','Mini Kiosk','60,000 บาท','ราคารวม VAT · ปีถัดไป 5,000/ปี (จาก 13,200)',
 E'ขอ AuthenCode ได้\nส่งตรวจผู้ป่วยจากบัตรประชาชน\nลงทะเบียนผู้ป่วยใหม่ (New HN)\nตรวจสอบกลุ่มเป้าหมายจาก MOPH-IC\nตรวจสอบสิทธิการรักษาจาก สปสช.\nตรวจสอบนัดหมายจาก MOPH-Appointment\nยืนยันสั่ง Lab / X-Ray ล่วงหน้าตามนัด',
 E'แท็บเล็ต Android v13+ ×1\nSmart Card Reader ×1\nThermal Printer ×1',50,CURRENT_TIMESTAMP),
('mini-lock','BMS Mini Kiosk (ปิดสิทธิ์)','ยืนยันตัวตนปิดสิทธิ์หลังรับบริการ · บน Tablet Android','Mini Kiosk','60,000 / 18,000 บาท','60,000 (มีเครื่องพิมพ์) · 18,000 (ไม่มีเครื่องพิมพ์) · ปีถัดไป Activation 5,000/ปี',
 E'อ่านบัตรประชาชนยืนยันตัวตนกับ BMS-HOSxP / XE / PCU XE\nตรวจสอบค่าใช้จ่ายก่อนยืนยันปิดสิทธิ์\nปิดสิทธิผ่าน API NHSO Endpoint for Single Claim\nยืนยันปิดสิทธิ + ปิดลูกหนี้ในโปรแกรม HOSxP\nรองรับชำระเงินผ่าน QRCode Payment (ตามเงื่อนไข)\nเฉพาะรุ่นมีเครื่องพิมพ์: พิมพ์ใบเสร็จ/ใบแจ้งหนี้ได้',
 E'แท็บเล็ต Android v13+ ×1\nSmart Card Reader ×1\nThermal Printer ×1 (เฉพาะรุ่น 60,000)',60,CURRENT_TIMESTAMP),
('payment','BMS Kiosk Payment (แบบทอนเงิน)','ตู้รับชำระค่าบริการอัตโนมัติ ทอนเงินได้','Payment Kiosk','390,000 บาท','รวมขนส่ง · ยังไม่รวม VAT',
 E'เชื่อมระบบห้องการเงิน BMS-HOSxP XE / HOSxP\nอ่าน Visit Number (VN) แบบ Barcode / QR\nตรวจสอบยอดค่าบริการ + ออกแบบ/แก้ใบเสร็จผ่าน HOSxP XE\nชำระด้วยเงินสด เหรียญ บัตรเครดิต/เดบิต และ QR Code\nทอนเงินอัตโนมัติ เหรียญ + ธนบัตร แบบ Recycle\nกำหนดเปิด-ปิดวิธีชำระ / บริการเงินทอนได้',
 E'ทอนเหรียญ 1/2/5/10 บาท (สูงสุด 1,000 เหรียญ)\nทอนธนบัตร 20/50/100/500/1,000 (สูงสุด 1,000 ใบ)\nรองรับบัตรเครดิต/เดบิต + QR Code\nมีระบบสำรองไฟ',70,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
