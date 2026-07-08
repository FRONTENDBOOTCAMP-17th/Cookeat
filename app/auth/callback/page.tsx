'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Session } from '@supabase/supabase-js';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const patchUser = useAuthStore((s) => s.patchUser);

  useEffect(() => {
    let settled = false;
    let sub: { unsubscribe: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function handle(session: Session | null) {
      if (settled) return;
      settled = true;
      sub?.unsubscribe();
      if (timer) clearTimeout(timer);
      if (!session) {
        router.replace('/');
        return;
      }
      const u = session.user;
      setAuth(session.access_token, session.refresh_token, {
        userId: u.id,
        dbUserId: 0,
        email: u.email ?? '',
        nickname:
          u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? '',
        profileImage: u.user_metadata?.custom_avatar_url ?? u.user_metadata?.avatar_url ?? null,
        isSocial: u.app_metadata?.provider !== 'email',
        role: 'user',
      });

      // middleware.ts가 읽을 httpOnly 쿠키 동기화 (OAuth는 클라이언트에서 토큰 획득)
      const syncRes = await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      });
      if (!syncRes.ok) {
        router.replace('/login');
        return;
      }

      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { complete, role, dbUserId } = await res.json();
      patchUser({ role: role ?? 'user', dbUserId: dbUserId ?? 0 });
      if (complete) alert('로그인되었습니다.');
      router.replace(!complete ? '/auth/profile' : '/');
    }

    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) console.error('[callback] exchangeCodeForSession error:', error.message);
        handle(data?.session ?? null);
      });
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) handle(session);
    });
    sub = subscription;
    timer = setTimeout(() => handle(null), 5000);
    return () => {
      sub?.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [router, setAuth, patchUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-text">로그인 처리 중...</p>
    </div>
  );
}
