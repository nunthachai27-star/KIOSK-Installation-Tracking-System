export const STEP_LABELS = ['ข้อมูลงาน', 'สินค้า & QC', 'จัดส่ง & ติดตั้ง', 'ส่งมอบ & บิล'] as const

export function buildSteps(active: 1 | 2 | 3 | 4) {
  return STEP_LABELS.map((label, i) => {
    const n = i + 1
    const state = n < active ? 'done' : n === active ? 'active' : 'todo'
    return { n: String(n), label, state: state as 'done' | 'active' | 'todo' }
  })
}
