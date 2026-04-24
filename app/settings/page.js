'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import BottomNav from '@/components/BottomNav';
import { Share2 } from 'lucide-react';
import Icon from '@/components/Icon';

const ROLE_LABEL = { groom: '신랑', bride: '신부' };

export default function SettingsPage() {
  const router = useRouter();
  const [loading,   setLoading]   = useState(true);
  const [user,      setUser]      = useState(null);
  const [couple,    setCouple]    = useState(null);
  const [partner,   setPartner]   = useState(null); // 상대방 정보
  const [copied,    setCopied]    = useState(false);
  const [canShare,  setCanShare]  = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: userData } = await supabase
        .from('users').select('*').eq('id', session.user.id).single();

      setUser({ ...userData, email: session.user.email });

      if (userData?.couple_id) {
        const [coupleRes, partnerRes] = await Promise.all([
          supabase.from('couples').select('*').eq('id', userData.couple_id).single(),
          // 나와 같은 couple_id인데 내 id가 아닌 유저 = 파트너
          supabase.from('users')
            .select('id, name, role')
            .eq('couple_id', userData.couple_id)
            .neq('id', session.user.id)
            .maybeSingle(),
        ]);
        setCouple(coupleRes.data);
        setPartner(partnerRes.data || null);
      }

      setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
      setLoading(false);
    };
    load();
  }, [router]);

  async function handleCopy() {
    if (!couple?.invite_code) return;
    await copyToClipboard(couple.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!couple?.invite_code) return;
    try {
      await navigator.share({
        title: 'Ourday 커플 연동 코드',
        text: `Ourday에서 나와 함께 결혼 준비해요! 초대 코드: ${couple.invite_code}`,
      });
    } catch { /* 공유 취소 무시 */ }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>설정</h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>account &amp; preferences</p>
      </div>

      {/* 내 프로필 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>내 정보</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>이름</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>{user?.name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>이메일</span>
            <span className="text-sm font-medium" style={{ color: 'var(--toss-text-primary)', wordBreak: 'break-all' }}>
              {user?.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>역할</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
              {ROLE_LABEL[user?.role] || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 커플 연동 상태 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>커플 연동</p>

        {couple ? (
          <>
            {/* 파트너 정보 */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-2xl"
              style={{ backgroundColor: partner ? 'var(--toss-blue-light)' : 'var(--toss-bg)' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full text-lg"
                  style={{ width: 40, height: 40, backgroundColor: partner ? 'var(--toss-blue)' : 'var(--toss-border)' }}>
                  {partner ? (partner.role === 'bride' ? '신부' : '신랑') : '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                    {partner ? partner.name : '연동 대기 중'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
                    {partner
                      ? `${ROLE_LABEL[partner.role]} · 연동 완료`
                      : '상대방이 아직 코드를 입력하지 않았어요'}
                  </p>
                </div>
              </div>
              {partner && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--toss-blue)', color: 'white' }}>
                  연동됨
                </span>
              )}
            </div>

            {/* 초대 코드 */}
            <p className="text-xs mb-2" style={{ color: 'var(--toss-text-tertiary)' }}>
              {partner ? '내 초대 코드' : '이 코드를 상대방에게 공유하세요'}
            </p>
            <div className="w-full py-4 rounded-2xl text-center mb-3"
              style={{ backgroundColor: 'var(--toss-blue-light)' }}>
              <p className="text-3xl font-bold tracking-[0.25em] tabular-nums"
                style={{ color: 'var(--toss-blue)' }}>
                {couple.invite_code}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline flex-1" onClick={handleCopy}>
                <span className="flex items-center gap-1.5">
                  <Icon name={copied ? 'check' : 'paperclip'} size={14} color="currentColor" />
                  {copied ? '복사됨!' : '코드 복사'}
                </span>
              </button>
              {canShare && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 font-semibold text-sm"
                  style={{
                    height: 48, paddingInline: 16, borderRadius: 12,
                    backgroundColor: 'var(--toss-blue)', color: 'white',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Share2 size={16} />
                  공유
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm mb-3" style={{ color: 'var(--toss-text-secondary)' }}>
              아직 커플 연동이 안 됐어요
            </p>
            <button className="btn-rose w-full" onClick={() => router.push('/connect')}>
              커플 연동하기
            </button>
          </div>
        )}
      </div>

      {/* 결혼 정보 */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--toss-text-tertiary)' }}>결혼 정보</p>
          <button
            onClick={() => router.push('/setup')}
            className="text-xs font-semibold"
            style={{ color: 'var(--toss-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {couple?.wedding_date ? '수정 →' : '설정하기 →'}
          </button>
        </div>
        {couple?.wedding_date ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>결혼식 날짜</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
                {new Date(couple.wedding_date).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {couple.wedding_region && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>지역</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--toss-text-primary)' }}>{couple.wedding_region}</span>
              </div>
            )}
            {couple.total_budget && (
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>총 예산</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--toss-text-primary)' }}>
                  {couple.total_budget.toLocaleString()}만원
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>아직 결혼 정보가 없어요</p>
        )}
      </div>

      {/* 로그아웃 */}
      {showLogoutConfirm ? (
        <div className="card mb-4" style={{ border: '1.5px solid var(--toss-red-light)', backgroundColor: 'var(--toss-red-light)' }}>
          <p className="text-sm font-semibold text-center mb-3" style={{ color: 'var(--toss-red)' }}>
            로그아웃 할까요?
          </p>
          <div className="flex gap-2">
            <button
              className="btn-outline flex-1"
              onClick={() => setShowLogoutConfirm(false)}
            >
              취소
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 font-semibold"
              style={{
                height: 48, borderRadius: 12,
                backgroundColor: 'var(--toss-red)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 14,
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full font-medium"
          style={{
            height: 48, borderRadius: 12, fontSize: 14,
            backgroundColor: 'var(--toss-card)',
            color: 'var(--toss-text-secondary)',
            border: '1.5px solid var(--toss-border)',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      )}

      <BottomNav active="home" />
    </div>
  );
}
