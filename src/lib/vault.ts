import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Files live under <cwd>/uploads/files — mounted to a docker volume in prod so
// they survive image rebuilds. Never store file bytes in the DB.
export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'files')
export const MAX_FILE_BYTES = 500 * 1024 * 1024 // 500 MB

export async function ensureUploadDir() {
  await mkdir(UPLOAD_ROOT, { recursive: true })
}

// Resolve a stored relative path to an absolute one, guarding against traversal.
export function resolveStored(storedPath: string): string | null {
  const abs = path.resolve(UPLOAD_ROOT, storedPath)
  if (abs !== UPLOAD_ROOT && !abs.startsWith(UPLOAD_ROOT + path.sep)) return null
  return abs
}

// Extension (lowercased, incl dot) from an original filename, if any.
export function extOf(name: string): string | null {
  const m = /\.[A-Za-z0-9]{1,12}$/.exec(name.trim())
  return m ? m[0].toLowerCase() : null
}
