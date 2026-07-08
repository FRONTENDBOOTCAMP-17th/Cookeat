'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const hydrated = useAuthStore((s) => s._hydrated)

  useEffect(() => {
    if (hydrated && accessToken) router.replace('/')
  }, [hydrated, accessToken, router])

  if (!hydrated) return null
  if (accessToken) return null

  return (
    <div className="min-h-screen flex flex-col">
      {children}
    </div>
  )
}
