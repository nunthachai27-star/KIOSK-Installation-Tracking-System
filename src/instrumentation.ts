// รันครั้งเดียวตอนเซิร์ฟเวอร์เริ่ม: ตั้งรอบส่งคิวแจ้งสถานะกลับ Vira ที่ค้าง (ทุก 1 นาที)
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { flushViraOutbox } = await import('./lib/vira')
  setInterval(() => { void flushViraOutbox() }, 60_000).unref()
}
