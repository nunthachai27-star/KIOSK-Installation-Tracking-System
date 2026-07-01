'use client'
import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-[13px] font-medium text-[#6E7191] hover:text-[#C13540]"
    >
      ออกจากระบบ
    </button>
  )
}
