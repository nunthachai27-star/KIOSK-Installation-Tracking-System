// ส่งข้อความเข้า LINE ผ่าน Messaging API (push) — ตั้งค่าใน env:
//   LINE_CHANNEL_TOKEN = channel access token ของ Messaging API
//   LINE_TO            = userId หรือ groupId ปลายทาง (คั่นหลายที่ด้วยจุลภาค)
// best-effort: ถ้าไม่ตั้งค่า หรือส่งพลาด จะเงียบ ไม่กระทบงานหลัก. (LINE Notify ปิดบริการแล้ว)
export async function pushLine(text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_TOKEN
  const to = process.env.LINE_TO
  if (!token || !to) return
  try {
    await Promise.all(to.split(',').map((id) => id.trim()).filter(Boolean).map((target) =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: target, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
      }).catch(() => {}),
    ))
  } catch {
    // อย่าให้การแจ้งเตือนทำให้การบันทึกล้ม
  }
}
