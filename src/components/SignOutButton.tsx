'use client'
import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-[13px] font-medium text-[#5A6B82] hover:text-[#C13540]"
    >
      ออกจากระบบ
    </button>
  )
}
