import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Role } from '@prisma/client'
import { verifyCredentials } from './credentials'

export { verifyCredentials }

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (c) => {
        const u = await verifyCredentials(String(c.username), String(c.password))
        return u ? { id: u.id, name: u.name, role: u.role } : null
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.role = (user as { role: Role }).role
      return token
    },
    session: ({ session, token }) => {
      if (session.user) (session.user as { role?: Role }).role = token.role as Role
      return session
    },
  },
})
