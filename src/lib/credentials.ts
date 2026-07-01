import bcrypt from 'bcryptjs'
import type { Role } from '@prisma/client'
import { prisma } from './prisma'

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.active) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return { id: user.id, name: user.name, role: user.role as Role }
}
