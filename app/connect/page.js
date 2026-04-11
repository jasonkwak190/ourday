'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
  const [myCode, setMyCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  // 진입 시 자동으로 couple row 생성 or 기존 코드 로드
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const uid = session.user.id;
      setUserId(uid);

      // 이미 couple_id가 있으면 기존 코드 표시
      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', uid)
        .single();

      if (user?.couple_id) {
        const { data: couple } = await supabase
          .from('couples')
          .select('invite_code')
          .eq('id', user.couple_id)
          .single();
        if (couple?.invite_code) {
          setMyCode(couple.invite_code);
          setLoading(false);
          return;
        }
      }

      // 없으면 새로 생성
      const code = generateInviteCode();
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .insert({ invite_code: code })
        .select()
        .single();

      if (coupleError) {
        console.error('couples insert error:', coupleError);
        setError(`코드 생성에 실패했어요. (${coupleError.message})`);
        setLoading(false);
        return;
      }

      await supabase
        .from('users')
        .update({ couple_id: couple.id })
        .eq('id', uid);

      setMyCode(code);
      setLoading(false);
    };

    init();
  }, [router]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
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
    router.push('/setup');
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--stone)' }}>
          <div className="text-3xl mb-2 animate-pulse">💑</div>
          <p className="text-sm">준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          커플 연동하기 💑
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          상대방과 연결해서 함께 준비해요
        </p>
      </div>

      {/* 내 초대 코드 */}
      <div className="card mb-4">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          내 초대 코드
        </p>
        <div
          className="w-full py-5 rounded-2xl text-center mb-3"
          style={{ backgroundColor: 'var(--rose-light)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>
            상대방에게 이 코드를 공유하세요
          </p>
          <p
            className="text-4xl font-bold tracking-widest"
            style={{ color: 'var(--rose)', fontFamily: 'monospace' }}
          >
            {myCode}
          </p>
        </div>
        <button className="btn-outline w-full" onClick={handleCopy}>
          {copied ? '✅ 복사됨!' : '📋 코드 복사하기'}
        </button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--stone-light)' }} />
        <span className="text-xs" style={{ color: 'var(--stone)' }}>상대방 코드가 있으면</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--stone-light)' }} />
      </div>

      {/* 코드 입력 */}
      <div className="card mt-2 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          상대방 코드 입력
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
          disabled={joining}
        >
          {joining ? '연동 중...' : '연동하기'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {/* 나중에 설정하기 */}
      <button
        className="mt-6 text-sm text-center"
        style={{ color: 'var(--stone)', background: 'none', border: 'none' }}
        onClick={() => router.push('/setup')}
      >
        나중에 연동할게요 →
      </button>
    </div>
  );
}
