// นิยามค่าที่แสดง (label/หน่วย + ช่วงค่าที่ยอมรับ) — client-safe (ไม่ import prisma)
// ใช้ร่วมทั้ง server (parse/กรอง) และ UI (แสดง/เรียง) · pats = คำเดาสำหรับเครื่องรุ่นอื่น (fallback)
export const FAT_METRICS: { key: string; label: string; unit: string; min?: number; max?: number; pats?: RegExp[] }[] = [
  { key: 'weight',       label: 'น้ำหนัก',              unit: 'kg',    min: 2,   max: 400,  pats: [/body_?weight/i, /\bweight\b/i, /\bwt\b/i, /体重/] },
  { key: 'height',       label: 'ส่วนสูง',              unit: 'cm',    min: 50,  max: 250,  pats: [/\bheight\b/i, /身高/] },
  { key: 'bmi',          label: 'BMI',                  unit: '',      min: 5,   max: 80,   pats: [/\bbmi\b/i] },
  { key: 'bodyFat',      label: 'ไขมันในร่างกาย',        unit: '%',     min: 1,   max: 75,   pats: [/body_?fat/i, /\bpbf\b/i, /\bbfr\b/i, /脂肪率/] },
  { key: 'fatMass',      label: 'มวลไขมัน',             unit: 'kg',    min: 0,   max: 200 },
  { key: 'subcutFat',    label: 'ไขมันใต้ผิวหนัง',       unit: '%',     min: 0,   max: 75 },
  { key: 'visceralFat',  label: 'ไขมันช่องท้อง',         unit: 'ระดับ', min: 1,   max: 60,   pats: [/visceral/i] },
  { key: 'muscleRate',   label: 'กล้ามเนื้อ',            unit: '%',     min: 5,   max: 95 },
  { key: 'muscle',       label: 'มวลกล้ามเนื้อ',         unit: 'kg',    min: 1,   max: 120,  pats: [/skeletal/i, /muscle_?mass/i, /肌肉/] },
  { key: 'fatFreeMass',  label: 'มวลไร้ไขมัน',           unit: 'kg',    min: 1,   max: 150 },
  { key: 'water',        label: 'น้ำในร่างกาย',          unit: '%',     min: 5,   max: 90,   pats: [/body_?water/i, /moisture/i, /水分/] },
  { key: 'protein',      label: 'โปรตีน',               unit: 'kg',    min: 0.5, max: 40,   pats: [/protein/i, /蛋白/] },
  { key: 'mineral',      label: 'แร่ธาตุ',              unit: 'kg',    min: 0.3, max: 15 },
  { key: 'boneMass',     label: 'มวลกระดูก',            unit: 'kg',    min: 0.3, max: 10,   pats: [/bone_?mass/i] },
  { key: 'bmr',          label: 'เผาผลาญพื้นฐาน (BMR)',  unit: 'kcal',  min: 300, max: 5000, pats: [/\bbmr\b/i, /basal/i] },
  { key: 'metabolicAge', label: 'อายุร่างกาย',          unit: 'ปี',    min: 5,   max: 120,  pats: [/metabolic_?age/i, /body_?age/i] },
  { key: 'bodyScore',    label: 'คะแนนสุขภาพ',          unit: 'คะแนน', min: 0,   max: 100 },
  { key: 'obesity',      label: 'ระดับความอ้วน',         unit: '%',     min: 0,   max: 400 },
  { key: 'whr',          label: 'เอว/สะโพก',            unit: 'WHR',   min: 0.3, max: 2 },
]
