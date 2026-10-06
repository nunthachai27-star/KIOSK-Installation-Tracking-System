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
    '/dev/team', '/api/dev/team',
    // จุดรับค่าเครื่องวัดความดัน (หน้าเดชบอร์ดทดสอบ) — เครื่องยิงเข้ามาโดยไม่มี login
    '/api/dev/bp',
    // หน้ารายงานเครื่องวัดความดันแบบสาธารณะ (เปิดจากลิงก์/QR อ่านอย่างเดียว)
    '/bp-report',
    // จุดรับค่าเครื่องวัดไขมัน ผ่าน API gateway (สาธารณะ ยิงเข้ามาโดยไม่มี login) + หน้ารายงานสาธารณะ
    '/api/dev/fat', '/fat-report',
    // หน้าสรุปเปรียบเทียบเครื่องวัดความดันสำหรับผู้บริหาร (สาธารณะผ่าน token, ไม่มีข้อมูลส่วนบุคคล)
    '/bp-summary',
    // ลิงก์ดูหน้าทดสอบความดันแบบ "ดูอย่างเดียว" (มี login bms/@1234 ของตัวเอง — ตรวจสิทธิ์ในหน้า/route เอง)
    '/bp-view', '/api/bp-view',
    // คู่มือสาธารณะ (เปิดจากลิงก์/QR) + ไฟล์คู่มือ — หน้า /manuals (จัดการ) ยังต้อง login
    '/manual', '/api/manual-file',
    // โชว์เคสโปรดัก Kiosk — เปิดหน้าสาธารณะ + API (leads GET ตรวจสิทธิ์ในตัวเอง).
    '/kiosk-products', '/api/kiosk-products',
    // หน้าข้อมูล License/MAC ต่อเครื่อง (อ่านอย่างเดียว) — ส่งลิงก์ให้โรงพยาบาลดู
    // เข้าถึงด้วย jobId (cuid เดาไม่ได้) ไม่มีปุ่มแก้ไข
    '/license']
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (isPublic) return

  const session = req.auth
  if (!session?.user) {
    return Response.redirect(new URL('/login', base))
  }

  const role = session.user.role

  // บัญชี "ผู้ชม" (VIEWER, read-only): เข้าดูได้ทุกหน้า แต่บล็อกทุก request ที่ไม่ใช่การอ่าน
  // (POST/PUT/PATCH/DELETE) ทั้งเว็บ เพื่อกันแก้/ลบ — ยกเว้น /api/auth (ออกจากระบบ)
  const isRead = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
  if (role === 'VIEWER' && !isRead && !pathname.startsWith('/api/auth')) {
    return new Response('อ่านอย่างเดียว — บัญชีผู้ชมไม่สามารถแก้ไข/ลบข้อมูลได้', { status: 403 })
  }

  const isApi = pathname.startsWith('/api')
  const isMobile = pathname === '/m' || pathname.startsWith('/m/')
  const isOfficePage = !isApi && !isMobile

  // หน้าเดสก์ท็อป (office) เปิดให้ OFFICE และ VIEWER (ผู้ชม) — role อื่นใช้แอปมือถือ /m
  if (isOfficePage && role !== 'OFFICE' && role !== 'VIEWER') {
    return Response.redirect(new URL('/m', base))
  }
})

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
