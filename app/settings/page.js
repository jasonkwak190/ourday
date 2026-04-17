'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [couple, setCouple] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUser({ ...userData, email: session.user.email });

      if (userData?.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .eq('id', userData.couple_id)
          .single();
        setCouple(coupleData);
      }

      setLoading(false);
    };
    load();
  }, [router]);

  async function handleCopy() {
    if (!couple?.invite_code) return;
    try {
      await navigator.clipboard.writeText(couple.invite_code);
    } catch {
      const el = document.createElement('textarea');
      el.value = couple.invite_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  const ROLE_LABEL = { groom: '신랑 🤵', bride: '신부 👰' };

  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--ink)' }}>
        ⚙️ 설정
      </h1>

      {/* 프로필 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--stone)' }}>내 정보</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>이름</span>
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>이메일</span>
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>역할</span>
            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {ROLE_LABEL[user?.role] || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 초대 코드 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--stone)' }}>커플 초대 코드</p>
        {couple?.invite_code ? (
          <>
            <div
              className="w-full py-4 rounded-2xl text-center mb-3"
              style={{ backgroundColor: 'var(--rose-light)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>이 코드를 상대방에게 공유하세요</p>
              <p
                className="text-3xl font-bold tracking-[0.25em]"
                style={{ color: 'var(--rose)', fontVariantNumeric: 'tabular-nums' }}
              >
                {couple.invite_code}
              </p>
            </div>
            <button className="btn-outline w-full" onClick={handleCopy}>
              {copied ? '✅ 복사됨!' : '📋 코드 복사하기'}
            </button>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm mb-3" style={{ color: 'var(--stone)' }}>아직 커플 연동이 안 됐어요</p>
            <button className="btn-rose w-full" onClick={() => router.push('/connect')}>
              커플 연동하기
            </button>
          </div>
        )}
      </div>

      {/* 결혼 정보 */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--stone)' }}>결혼 정보</p>
          <button
            onClick={() => router.push('/setup')}
            className="text-xs font-medium"
            style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {couple?.wedding_date ? '수정 →' : '설정하기 →'}
          </button>
        </div>
        {couple?.wedding_date ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>결혼식 날짜</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {new Date(couple.wedding_date).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {couple.wedding_region && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>지역</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{couple.wedding_region}</span>
              </div>
            )}
            {couple.total_budget && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>총 예산</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {couple.total_budget.toLocaleString()}만원
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--stone)' }}>아직 결혼 정보가 없어요</p>
        )}
      </div>

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{
          backgroundColor: 'white',
          color: 'var(--stone)',
          border: '1.5px solid var(--stone-light)',
        }}
      >
        로그아웃
      </button>

      <BottomNav active="home" />
    </div>
  );
}
