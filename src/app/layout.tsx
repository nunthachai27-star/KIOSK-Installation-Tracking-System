import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimeWash } from "@/components/TimeWash";

export const metadata: Metadata = {
  title: "KIOSK Tracking",
  description: "ระบบบันทึกและติดตามงานติดตั้ง KIOSK",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Apply the signed-in user's colour theme + background style app-wide
  // (no flash — set on <html> server-side).
  const session = await auth()
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { theme: true, bg: true } })
    : null
  const theme = me?.theme ?? undefined
  const bg = me?.bg ?? undefined
  return (
    <html lang="th" data-theme={theme} data-bg={bg} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="app-bg" aria-hidden="true"><span></span><span></span><span></span></div>
        <TimeWash />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
