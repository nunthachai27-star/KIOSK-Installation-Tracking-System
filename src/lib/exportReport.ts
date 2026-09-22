// ดาวน์โหลด DOM หนึ่งก้อน (ตาม id) เป็น PNG หรือ PDF A4 (แบ่งหลายหน้าอัตโนมัติ)
// โหลด lib ตอนเรียกใช้ (lazy) เพื่อไม่ให้ bundle หน้าใหญ่
export async function downloadNodePng(nodeId: string, filename: string): Promise<void> {
  const node = document.getElementById(nodeId); if (!node) return
  const { toPng } = await import('html-to-image')
  const url = await toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
  const a = document.createElement('a'); a.href = url; a.download = filename.endsWith('.png') ? filename : `${filename}.png`; a.click()
}

export async function downloadNodePdf(nodeId: string, filename: string): Promise<void> {
  const node = document.getElementById(nodeId); if (!node) return
  const { toPng } = await import('html-to-image')
  const { jsPDF } = await import('jspdf')
  const url = await toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
  const img = new Image(); img.src = url; await img.decode()
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const margin = 8, pageW = 210 - margin * 2, pageH = 297 - margin * 2
  const pxPerMm = img.width / pageW
  const pageHpx = pageH * pxPerMm
  let sy = 0, page = 0
  while (sy < img.height) {
    const sliceH = Math.min(pageHpx, img.height - sy)
    const c = document.createElement('canvas'); c.width = img.width; c.height = sliceH
    const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, sy, img.width, sliceH, 0, 0, img.width, sliceH) }
    if (page > 0) pdf.addPage()
    pdf.addImage(c.toDataURL('image/png'), 'PNG', margin, margin, pageW, sliceH / pxPerMm)
    sy += sliceH; page++
  }
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
