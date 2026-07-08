'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toAuthUser } from '@/services/auth/authTypes'

// 앱 시작 시 스토리지에서 세션 복원 및 Supabase 토큰 자동 갱신을 담당하는 초기화 컴포넌트
export default function AuthInitializer() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const hydrated = useAuthStore((s) => s._hydrated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const rehydrate = useAuthStore((s) => s.rehydrate)

  // localStorage / sessionStorage에서 세션 복원
  useEffect(() => {
    rehydrate()
  }, [rehydrate])

  // Supabase가 토큰을 자동 갱신하면 스토어도 업데이트
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        const existingUser = useAuthStore.getState().user
        setAuth(
          session.access_token,
          session.refresh_token,
          existingUser ?? toAuthUser(session.user),
        )
      }
      if (event === 'SIGNED_OUT') clearAuth()
    })
    return () => subscription.unsubscribe()
  }, [setAuth, clearAuth])

  // 복원 완료 후 저장된 토큰을 Supabase 클라이언트에 주입
  // hydrated가 true로 바뀌는 시점에만 1회 실행되어야 하므로 accessToken/refreshToken은 의도적으로 deps에서 제외
  useEffect(() => {
    if (!hydrated || !accessToken || !refreshToken) return
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => { if (error) clearAuth() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  return null
}
