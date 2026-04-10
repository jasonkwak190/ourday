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
  const [tab, setTab] = useState('create');
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, []);

  async function handleCreateCode() {
    setError('');
    setLoading(true);
    const code = generateInviteCode();

    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .insert({ invite_code: code })
      .select()
      .single();

    if (coupleError) {
      setError('코드 생성에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    await supabase
      .from('users')
      .update({ couple_id: couple.id })
      .eq('id', userId);

    setInviteCode(code);
    setLoading(false);
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleJoinCode() {
    setError('');
    if (inputCode.trim().length !== 6) {
      setError('6자리 코드를 입력해주세요.');
      return;
    }
    setLoading(true);

    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('id')
      .eq('invite_code', inputCode.trim().toUpperCase())
      .single();

    if (findError || !couple) {
      setError('코드를 찾을 수 없어요. 다시 확인해주세요.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ couple_id: couple.id })
      .eq('id', userId);

    if (updateError) {
      setError('연동에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/setup');
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          커플 연동하기 💑
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          상대방과 연결해서 함께 준비해요
        </p>
      </div>

      {/* 탭 */}
      <div
        className="flex rounded-xl p-1 mb-6"
        style={{ backgroundColor: 'var(--beige)' }}
      >
        {[
          { key: 'create', label: '코드 생성' },
          { key: 'join', label: '코드 입력' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(''); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? 'var(--ink)' : 'var(--stone)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 코드 생성 */}
      {tab === 'create' && (
        <div className="card flex flex-col items-center gap-5">
          <p className="text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
            초대 코드를 생성하고 상대방에게 공유하세요.
          </p>

          {!inviteCode ? (
            <button
              className="btn-rose w-full"
              onClick={handleCreateCode}
              disabled={loading || !userId}
            >
              {loading ? '생성 중...' : '초대 코드 생성하기'}
            </button>
          ) : (
            <>
              <div
                className="w-full py-5 rounded-2xl text-center"
                style={{ backgroundColor: 'var(--rose-light)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>초대 코드</p>
                <p
                  className="text-4xl font-bold tracking-widest"
                  style={{ color: 'var(--rose)', fontFamily: 'monospace' }}
                >
                  {inviteCode}
                </p>
              </div>
              <button className="btn-outline w-full" onClick={handleCopyCode}>
                {copied ? '✅ 복사됨!' : '📋 코드 복사하기'}
              </button>
              <button
                className="btn-rose w-full"
                onClick={() => router.push('/setup')}
              >
                다음으로 →
              </button>
            </>
          )}
        </div>
      )}

      {/* 코드 입력 */}
      {tab === 'join' && (
        <div className="card flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            상대방이 공유한 6자리 코드를 입력해주세요.
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
            onClick={handleJoinCode}
            disabled={loading || !userId}
          >
            {loading ? '연동 중...' : '연동하기'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-center mt-4" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
