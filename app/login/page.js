'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <div className="page-wrapper flex flex-col">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: 'var(--toss-blue)' }}
        >
          Ourday
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          다시 만나서 반가워요 💍
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            이메일
          </label>
          <input
            className="input-field"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            비밀번호
          </label>
          <input
            className="input-field"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--rose)' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn-rose w-full mt-2" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--stone)' }}>
        계정이 없어요?{' '}
        <Link href="/signup" style={{ color: 'var(--rose)', fontWeight: 500 }}>
          가입하기
        </Link>
      </p>
    </div>
  );
}
