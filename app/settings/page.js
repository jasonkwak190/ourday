'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageLoader from '@/components/PageLoader';
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
  const [showLogoutConfirm,  setShowLogoutConfirm]  = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [deleteInput,        setDeleteInput]        = useState('');
  const [deleteLoading,      setDeleteLoading]      = useState(false);
  const [deleteError,        setDeleteError]        = useState('');

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

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error || '삭제에 실패했어요.');
        setDeleteLoading(false);
        return;
      }
      // 성공 → 세션 정리 후 랜딩으로
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleteError('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setDeleteLoading(false);
    }
  }

  if (loading) return <PageLoader />;

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

      {/* 이용약관·개인정보처리방침 링크 */}
      <div className="flex gap-4 justify-center mt-6 mb-2">
        {[
          { href: '/terms', label: '이용약관' },
          { href: '/privacy', label: '개인정보처리방침' },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline' }}
          >
            {label}
          </a>
        ))}
      </div>

      {/* 계정 탈퇴 */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteInput(''); setDeleteError(''); }}
          className="w-full font-medium mt-2 mb-4"
          style={{
            height: 44, borderRadius: 12, fontSize: 13,
            backgroundColor: 'transparent',
            color: 'var(--ink-4)',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          계정 탈퇴
        </button>
      ) : (
        <div
          className="card mb-4 mt-2"
          style={{ border: '1.5px solid var(--toss-red-light)', backgroundColor: 'rgba(255,59,48,0.04)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--toss-red)' }}>
            계정을 삭제하면 복구할 수 없어요
          </p>
          {partner && (
            <div
              className="flex items-start gap-2 mb-3 p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--toss-red)', margin: 0, fontWeight: 700 }}>
                  파트너 {partner.name}님 계정에도 영향을 줍니다
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--toss-red)', margin: 0, opacity: 0.9 }}>
                  탈퇴 시 두 분이 함께 만든 체크리스트·예산·업체·하객 명단·메모·청첩장이{' '}
                  <strong style={{ textDecoration: 'underline' }}>{partner.name}님 계정에서도 모두 사라지며 복구할 수 없어요.</strong>
                  {' '}{partner.name}님께 미리 알려주세요.
                </p>
              </div>
            </div>
          )}
          <p className="text-xs mb-4" style={{ color: 'var(--toss-text-tertiary)' }}>
            {partner
              ? '탈퇴하면 커플 연동이 해제되며, 두 분이 함께 쌓은 모든 준비 기록이 영구 삭제됩니다. (내 로그인 정보 + 공유 데이터)'
              : '작성한 체크리스트, 예산, 하객 명단 등 모든 데이터가 삭제됩니다.'}
          </p>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--toss-text-secondary)' }}>
            확인을 위해 <strong style={{ color: 'var(--toss-red)' }}>탈퇴합니다</strong> 를 입력해주세요
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="탈퇴합니다"
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            style={{ marginBottom: 12 }}
            autoComplete="off"
          />
          {deleteError && (
            <p className="text-xs mb-3" style={{ color: 'var(--toss-red)' }}>{deleteError}</p>
          )}
          <div className="flex gap-2">
            <button
              className="btn-outline flex-1"
              onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(''); }}
              disabled={deleteLoading}
            >
              취소
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteInput !== '탈퇴합니다' || deleteLoading}
              className="flex-1 font-semibold"
              style={{
                height: 48, borderRadius: 12,
                backgroundColor: deleteInput === '탈퇴합니다' ? 'var(--toss-red)' : 'var(--toss-border)',
                color: 'white',
                border: 'none',
                cursor: deleteInput === '탈퇴합니다' ? 'pointer' : 'not-allowed',
                fontSize: 14,
                transition: 'background-color 0.15s',
              }}
            >
              {deleteLoading ? '삭제 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
}
