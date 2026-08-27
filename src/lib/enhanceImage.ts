// ประมวลผลรูปเอกสารฝั่งเบราว์เซอร์ให้ดู "สแกน" ชัดขึ้น + บีบอัด (ไม่ใช้ไลบรารีนอก):
//  1) ย่อขนาด (ด้านยาวสุด ≤ maxSide) — เบา ประหยัดพื้นที่
//  2) ปรับระดับอัตโนมัติ (auto-levels): ยืดคอนทราสต์ให้กระดาษขาว-ตัวอักษรเข้ม
//  3) เพิ่มความคมชัด (unsharp) เล็กน้อย
//  4) ส่งออกเป็น JPEG คุณภาพ ~0.85
// คืนค่าเป็น File ใหม่ (ชื่อลงท้าย .jpg). ถ้าทำไม่ได้ (ไม่ใช่รูป/เบราว์เซอร์ไม่รองรับ) คืนไฟล์เดิม.

const MAX_SIDE = 1800

export async function enhanceImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bmp = await loadBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    if ('close' in bmp && typeof bmp.close === 'function') bmp.close()

    const img = ctx.getImageData(0, 0, w, h)
    autoLevels(img.data)
    const sharp = unsharp(img.data, w, h, 0.6)
    const outImg = ctx.createImageData(w, h)
    outImg.data.set(sharp)
    ctx.putImageData(outImg, 0, 0)

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file) } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const el = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = reject
      im.src = url
    })
    return el
  } finally { URL.revokeObjectURL(url) }
}

// ยืดคอนทราสต์ตามเปอร์เซ็นไทล์ของความสว่าง (ตัด outlier 0.5% หัว-ท้าย) — ใช้กับ R,G,B เท่ากัน (คงสี)
function autoLevels(data: Uint8ClampedArray) {
  const hist = new Uint32Array(256)
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
    hist[l]++
  }
  const cut = n * 0.005
  let lo = 0, hi = 255, acc = 0
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > cut) { lo = v; break } }
  acc = 0
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > cut) { hi = v; break } }
  if (hi - lo < 16) return // คอนทราสต์ปกติอยู่แล้ว ไม่ต้องยืด
  const scale = 255 / (hi - lo)
  const lut = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) lut[v] = Math.min(255, Math.max(0, (v - lo) * scale))
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }
}

// unsharp mask แบบ 3x3 (amount ~0.6) เพื่อคมขึ้นเล็กน้อย ไม่ให้ noise เด้ง
function unsharp(src: Uint8ClampedArray, w: number, h: number, amount: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length)
  const c = 1 + 4 * amount, s = -amount
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; out[i + 3] = src[i + 3]
        continue
      }
      for (let k = 0; k < 3; k++) {
        const v = c * src[i + k]
          + s * src[i - 4 + k] + s * src[i + 4 + k]
          + s * src[i - w * 4 + k] + s * src[i + w * 4 + k]
        out[i + k] = v < 0 ? 0 : v > 255 ? 255 : v
      }
      out[i + 3] = src[i + 3]
    }
  }
  return out
}
