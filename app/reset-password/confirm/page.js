'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showPw2,   setShowPw2]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');
  const [ready,     setReady]     = useState(false);

  // Supabase가 URL hash(#access_token=...)를 처리해 세션을 설정할 때까지 대기
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 일치하지 않아요.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError('비밀번호 변경에 실패했어요. 링크가 만료됐을 수 있어요.');
    } else {
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    }
  }

  if (!ready) {
    return (
      <div className="page-wrapper flex flex-col items-center justify-center py-24">
        <div className="flex items-center justify-center mb-4"
          style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'var(--toss-blue-light)' }}>
          <Lock size={24} color="var(--toss-blue)" />
        </div>
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
          인증 중...
        </p>
      </div>
    );
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="flex items-center justify-center mb-6"
        style={{ width: 56, height: 56, borderRadius: 16,
          backgroundColor: 'var(--toss-blue-light)', alignSelf: 'center' }}>
        <Lock size={24} color="var(--toss-blue)" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
          새 비밀번호 설정
        </h1>
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
          8자 이상으로 설정해주세요
        </p>
      </div>

      {done ? (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-4">
            <CheckCircle size={48} color="var(--toss-green)" />
          </div>
          <p className="text-base font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
            비밀번호가 변경됐어요!
          </p>
          <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
            잠시 후 대시보드로 이동해요
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>
              새 비밀번호
            </label>
            <div className="relative">
              <input
                className="input-field"
                type={showPw ? 'text' : 'password'}
                placeholder="8자 이상 입력"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 48 }}
                required
              />
              <button type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showPw
                  ? <EyeOff size={18} color="var(--toss-text-tertiary)" />
                  : <Eye size={18} color="var(--toss-text-tertiary)" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>
              새 비밀번호 확인
            </label>
            <div className="relative">
              <input
                className="input-field"
                type={showPw2 ? 'text' : 'password'}
                placeholder="동일하게 다시 입력"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                style={{
                  paddingRight: 48,
                  borderColor: password2 && password2 !== password ? 'var(--toss-red)' : undefined,
                }}
                required
              />
              <button type="button"
                onClick={() => setShowPw2(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showPw2
                  ? <EyeOff size={18} color="var(--toss-text-tertiary)" />
                  : <Eye size={18} color="var(--toss-text-tertiary)" />}
              </button>
            </div>
            {password2 && password !== password2 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--toss-red)' }}>비밀번호가 일치하지 않아요</p>
            )}
            {password2 && password === password2 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--toss-green)' }}>✓ 비밀번호가 일치해요</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
          )}

          <button type="submit" className="btn-rose w-full" disabled={loading}
            style={{ height: 52 }}>
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </div>
  );
}
