import { auth } from '@/lib/auth'

// Auth + role boundary for the whole app. The `(office)` route group is only a
// folder, not a security boundary, so role enforcement lives here.
//
// - Public: /login and /api/auth/*
// - Everything else requires a session (else → /login)
// - Desktop office pages (everything that isn't /m/** or /api/**) are OFFICE-only;
//   a FIELD user is sent to the mobile app at /m.
// - API routes enforce their own per-endpoint role checks in the handlers.
export default auth((req) => {
  const { pathname } = req.nextUrl
  // Behind a reverse proxy the request host may be the internal IP, so build
  // redirect targets from the public AUTH_URL when it is configured.
  const base = process.env.AUTH_URL || req.nextUrl.origin

  // Public: executive dashboard + hospital satisfaction rating (no login).
  // Bounded matching (exact path or under it) so e.g. "/exec-secret" is NOT public.
  const PUBLIC = ['/api/auth', '/login', '/exec', '/rate', '/api/rate', '/borrow', '/api/borrow-request',
    '/manifest.webmanifest', '/icons', '/apple-touch-icon.png', '/favicon.png', '/.well-known',
    // เครื่องมือออกแบบปุ่ม Kiosk — เปิดสาธารณะเฉพาะหน้านี้ + API ของมันเท่านั้น
    // (DELETE/สถิติ ตรวจสิทธิ์ในตัวจัดการเอง) ที่เหลือของเว็บยังต้อง login เหมือนเดิม
    '/kiosk-buttons', '/api/kiosk-buttons',
    // ลิงก์ทีมพัฒนา (แถบพัฒนา) — เปิดเฉพาะ /dev/team/<token> + API ของมัน (ตรวจ token เอง).
    // หน้า /dev (เจ้าหน้าที่) และ /api/dev-requests ยังต้อง login OFFICE เหมือนเดิม.
    '/dev/team', '/api/dev/team']
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (isPublic) return

  const session = req.auth
  if (!session?.user) {
    return Response.redirect(new URL('/login', base))
  }

  const isApi = pathname.startsWith('/api')
  const isMobile = pathname === '/m' || pathname.startsWith('/m/')
  const isOfficePage = !isApi && !isMobile

  if (isOfficePage && session.user.role !== 'OFFICE') {
    // FIELD (and any non-OFFICE role) uses the mobile app, not the desktop office UI.
    return Response.redirect(new URL('/m', base))
  }
})

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
