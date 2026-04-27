'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * 세션 → users 테이블 조회를 공통화한 훅.
 * 10개 페이지에서 반복되던 boilerplate를 제거.
 *
 * @param {string} fields - select할 컬럼 (기본: 'couple_id, role, name, id')
 * @returns {{ coupleId, userData, userId, loading }}
 *   - coupleId: null이면 커플 미연동 상태
 *   - userData: users 테이블 row
 *   - userId: auth.users id
 *   - loading: 초기 조회 중
 */
export function useCouple(fields = 'couple_id, role, name, id') {
  const router  = useRouter();
  const [coupleId,  setCoupleId]  = useState(null);
  const [userData,  setUserData]  = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      if (cancelled) return;

      setUserId(session.user.id);

      const { data: user } = await supabase
        .from('users')
        .select(fields)
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;
      if (user?.couple_id) setCoupleId(user.couple_id);
      setUserData(user || null);
      setLoading(false);
    };

    init();

    // 세션 만료 또는 로그아웃 감지 → 로그인 페이지로 이동
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coupleId, userData, userId, loading };
}
