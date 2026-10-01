import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // ผ่าน proxy/middleware จะ buffer body ไว้ (default 10MB) — คู่มือ PDF มักใหญ่กว่านั้น
    // ขยายเป็น 50MB เพื่อให้อัปโหลดไฟล์คู่มือ/เอกสารขนาดใหญ่ได้
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
