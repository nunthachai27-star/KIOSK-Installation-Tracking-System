'use client'
import { SessionProvider } from 'next-auth/react'
import { DialogHost } from '@/lib/dialog'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <DialogHost />
    </SessionProvider>
  )
}
