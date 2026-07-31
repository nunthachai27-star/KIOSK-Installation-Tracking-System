import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "KIOSK Tracking",
  description: "ระบบบันทึกและติดตามงานติดตั้ง KIOSK",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Apply the signed-in user's colour theme app-wide (no flash — set on <html> server-side).
  const session = await auth()
  const theme = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { theme: true } }))?.theme ?? undefined
    : undefined
  return (
    <html lang="th" data-theme={theme} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
