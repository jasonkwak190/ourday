'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--toss-blue)' }}>
          Ourday
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
          다시 만나서 반가워요 💍
        </p>
      </div>

      {/* OAuth 버튼 — 메인 */}
      <OAuthButtons />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
        <span className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>이메일로 로그인</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
      </div>

      {/* 이메일 폼 */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold block mb-1.5"
            style={{ color: 'var(--toss-text-secondary)' }}>
            이메일
          </label>
          <input
            className="input-field"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5"
            style={{ color: 'var(--toss-text-secondary)' }}>
            비밀번호
          </label>
          <input
            className="input-field"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
        )}

        <button type="submit" className="btn-rose w-full" disabled={loading}
          style={{ height: 52 }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--toss-text-tertiary)' }}>
        계정이 없어요?{' '}
        <Link href="/signup" style={{ color: 'var(--toss-blue)', fontWeight: 600 }}>
          가입하기
        </Link>
      </p>
    </div>
  );
}
