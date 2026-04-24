'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import OnboardingProgress from '@/components/OnboardingProgress';
import { Share2 } from 'lucide-react';
import Icon from '@/components/Icon';

function generateInviteCode() {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

export default function ConnectPage() {
  const router = useRouter();
  const [myCode,           setMyCode]           = useState('');
  const [inputCode,        setInputCode]        = useState('');
  const [copied,           setCopied]           = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [joining,          setJoining]          = useState(false);
  const [error,            setError]            = useState('');
  const [userId,           setUserId]           = useState(null);
  const [coupleId,         setCoupleId]         = useState(null);
  const [coupleIdRef,      setCoupleIdRef]      = useState(null); // Realtime 구독용
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [justConnected,    setJustConnected]    = useState(false);
  const [canShare,         setCanShare]         = useState(false); // Web Share API 지원 여부
  const autoSubmitRef = useRef(false); // 자동 submit 중복 방지

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const uid = session.user.id;
      setUserId(uid);

      // 기존 couple_id 확인
      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', uid)
        .single();

      if (user?.couple_id) {
        const cId = user.couple_id;
        setCoupleId(cId);

        // 코드 로드
        const { data: couple } = await supabase
          .from('couples')
          .select('invite_code')
          .eq('id', cId)
          .single();
        if (couple?.invite_code) setMyCode(couple.invite_code);

        // 파트너 연동 여부 확인
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('couple_id', cId);
        if (count >= 2) setPartnerConnected(true);

        setLoading(false);
        return;
      }

      // 없으면 새 couple 생성
      const code = generateInviteCode();
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .insert({ invite_code: code })
        .select()
        .single();

      if (coupleError) {
        setError(`코드 생성에 실패했어요. (${coupleError.message})`);
        setLoading(false);
        return;
      }

      await supabase
        .from('users')
        .update({ couple_id: couple.id })
        .eq('id', uid);

      setCoupleId(couple.id);
      setCoupleIdRef(couple.id);
      setMyCode(code);
      setLoading(false);
    };

    init();
    // Web Share API 지원 여부 확인
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, [router]);

  // 6자리 코드 자동 submit
  useEffect(() => {
    if (inputCode.length === 6 && !joining && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      handleJoin();
    }
    if (inputCode.length < 6) autoSubmitRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputCode]);

  // Realtime — 파트너 연동 감지
  useEffect(() => {
    if (!coupleIdRef || partnerConnected) return;
    const ch = supabase
      .channel(`connect-${coupleIdRef}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `couple_id=eq.${coupleIdRef}` },
        async () => {
          const { count } = await supabase
            .from('users').select('id', { count: 'exact', head: true }).eq('couple_id', coupleIdRef);
          if (count >= 2) setPartnerConnected(true);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [coupleIdRef, partnerConnected]);

  async function handleCopy() {
    try {
      await copyToClipboard(myCode);
    } catch {
      const el = document.createElement('textarea');
      el.value = myCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: 'Ourday 커플 연동 코드',
        text: `Ourday에서 나와 함께 결혼 준비해요! 초대 코드: ${myCode}`,
      });
    } catch {
      // 공유 취소 등 무시
    }
  }

  async function handleJoin() {
    setError('');
    if (inputCode.trim().length !== 6) {
      setError('6자리 코드를 입력해주세요.');
      return;
    }
    setJoining(true);

    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('id')
      .eq('invite_code', inputCode.trim().toUpperCase())
      .single();

    if (findError || !couple) {
      setError('코드를 찾을 수 없어요. 다시 확인해주세요.');
      setJoining(false);
      return;
    }

    // 자기 코드 입력 방지
    const { data: myUser } = await supabase
      .from('users')
      .select('couple_id')
      .eq('id', userId)
      .single();

    if (myUser?.couple_id === couple.id) {
      setError('내 코드는 입력할 수 없어요.');
      setJoining(false);
      return;
    }

    // 이미 2명이 연동된 커플인지 확인
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', couple.id);

    if (count >= 2) {
      setError('이미 연동된 커플이에요. 코드를 다시 확인해주세요.');
      setJoining(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ couple_id: couple.id })
      .eq('id', userId);

    if (updateError) {
      setError('연동에 실패했어요. 다시 시도해주세요.');
      setJoining(false);
      return;
    }

    setJoining(false);
    setJustConnected(true);
    setPartnerConnected(true);

    // 2초 후 자동 이동
    setTimeout(() => router.push('/setup'), 2000);
  }

  // ─── 로딩 ───
  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--toss-text-secondary)' }}>
          <div className="mb-2 animate-pulse flex justify-center"><Icon name="couple" size={36} color="var(--champagne)" /></div>
          <p className="text-sm">준비 중...</p>
        </div>
      </div>
    );
  }

  // ─── 방금 연동 성공 ───
  if (justConnected) {
    return (
      <div className="page-wrapper flex flex-col items-center justify-center text-center">
        <OnboardingProgress current={2} />
        <div
          className="flex items-center justify-center mb-6"
          style={{
            width: 80, height: 80, borderRadius: '50%',
            backgroundColor: 'var(--toss-blue-light)',
          }}
        >
          <Icon name="couple" size={40} color="var(--champagne)" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
          연동 완료!
        </h2>
        <p className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>
          상대방과 연결됐어요<br />결혼 정보를 입력하러 가요
        </p>
        <p className="text-xs mt-4" style={{ color: 'var(--toss-text-tertiary)' }}>
          잠시 후 자동으로 이동해요...
        </p>
      </div>
    );
  }

  // ─── 이미 파트너 연동된 상태 ───
  if (partnerConnected) {
    return (
      <div className="page-wrapper flex flex-col">
        <OnboardingProgress current={2} />

        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 72, height: 72, borderRadius: '50%',
              backgroundColor: 'var(--toss-blue-light)',
            }}
          >
            <Icon name="couple" size={36} color="var(--champagne)" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
            이미 커플 연동이 됐어요!
          </h1>
          <p className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>
            상대방과 연결된 상태예요
          </p>
        </div>

        <div
          className="card mb-6 text-center"
          style={{ backgroundColor: 'var(--toss-blue-light)', boxShadow: 'none' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--toss-text-secondary)' }}>
            내 초대 코드
          </p>
          <p
            className="text-3xl font-bold tracking-[0.2em] tabular-nums"
            style={{ color: 'var(--toss-blue)' }}
          >
            {myCode}
          </p>
        </div>

        <button
          className="btn-rose w-full"
          onClick={() => router.push('/setup')}
        >
          다음 단계로 →
        </button>
        <button
          className="btn-ghost w-full mt-2"
          onClick={() => router.push('/dashboard')}
        >
          대시보드로 가기
        </button>
      </div>
    );
  }

  // ─── 기본: 코드 공유 + 입력 ───
  return (
    <div className="page-wrapper flex flex-col">
      <OnboardingProgress current={2} />

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--toss-text-primary)' }}>
          커플 연동하기
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--toss-text-secondary)' }}>
          상대방과 연결해서 함께 준비해요
        </p>
      </div>

      {/* 내 초대 코드 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>
          📤 내 초대 코드를 상대방에게 보내세요
        </p>
        <div
          className="w-full py-5 rounded-2xl text-center mb-3"
          style={{ backgroundColor: 'var(--toss-blue-light)' }}
        >
          <p
            className="text-4xl font-bold tracking-[0.25em] tabular-nums"
            style={{ color: 'var(--toss-blue)' }}
          >
            {myCode}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline flex-1 flex items-center justify-center gap-1.5" onClick={handleCopy}>
            <Icon name={copied ? 'check' : 'paperclip'} size={14} color="currentColor" />
            {copied ? '복사됨!' : '코드 복사'}
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

        {/* 파트너 연동 대기 상태 */}
        {!partnerConnected && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <span className="animate-pulse text-base">⏳</span>
            <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
              상대방이 코드를 입력하면 자동으로 연동돼요
            </p>
          </div>
        )}
        {partnerConnected && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <Icon name="couple" size={18} color="var(--champagne)" />
            <p className="text-xs font-semibold" style={{ color: 'var(--toss-green)' }}>
              상대방이 연동됐어요!
            </p>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
        <span className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
          상대방 코드가 있으면
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
      </div>

      {/* 코드 입력 */}
      <div className="card mt-2 flex flex-col gap-3">
        <p className="text-xs font-semibold" style={{ color: 'var(--toss-text-tertiary)' }}>
          📥 상대방 코드 입력
        </p>
        <input
          className="input-field text-center text-2xl tracking-widest font-bold"
          type="text"
          placeholder="XXXXXX"
          maxLength={6}
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
        />
        <button
          className="btn-rose w-full"
          onClick={handleJoin}
          disabled={joining || inputCode.trim().length !== 6}
        >
          {joining ? '연동 중...' : '연동하기'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: 'var(--toss-red)' }}>
          {error}
        </p>
      )}

      {/* 나중에 연동할게요 */}
      <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--toss-border)' }}>
        <p className="text-xs text-center mb-3" style={{ color: 'var(--toss-text-tertiary)' }}>
          상대방 코드가 없어도 괜찮아요. 나중에 설정에서 연동할 수 있어요.
        </p>
        <button
          className="btn-ghost w-full"
          onClick={() => router.push('/setup')}
        >
          나중에 연동할게요
        </button>
      </div>
    </div>
  );
}
