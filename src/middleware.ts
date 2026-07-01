import { auth } from '@/lib/auth'

export default auth((req) => {
  const isAuthed = !!req.auth
  const { pathname } = req.nextUrl
  const isLogin = pathname.startsWith('/login')
  const isPublic = pathname.startsWith('/api/auth') || isLogin
  if (!isAuthed && !isPublic) {
    const url = new URL('/login', req.nextUrl.origin)
    return Response.redirect(url)
  }
})

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
