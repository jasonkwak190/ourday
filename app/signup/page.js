'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('groom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요.'); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId, name: name.trim(), role });

      if (insertError) {
        setError(`프로필 저장 실패: ${insertError.message}`);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push('/connect');
  }

  return (
    <div className="page-wrapper flex flex-col">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: 'var(--toss-blue)' }}
        >
          Ourday
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          함께 시작하는 첫 걸음
        </p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        {/* 이름 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            이름
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* 이메일 */}
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

        {/* 비밀번호 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            비밀번호
          </label>
          <input
            className="input-field"
            type="password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* 역할 토글 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            나는요
          </label>
          <div className="flex gap-3">
            {[
              { value: 'groom', label: '신랑 🤵' },
              { value: 'bride', label: '신부 👰' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: role === r.value ? 'var(--rose)' : 'white',
                  color: role === r.value ? 'white' : 'var(--stone)',
                  border: `1.5px solid ${role === r.value ? 'var(--rose)' : 'var(--stone-light)'}`,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--rose)' }}>
            {error}
          </p>
        )}

        {/* 제출 */}
        <button type="submit" className="btn-rose w-full mt-2" disabled={loading}>
          {loading ? '가입 중...' : '가입하기'}
        </button>
      </form>

      {/* 카카오 로그인 */}
      <div className="mt-4">
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--stone-light)' }} />
          <span className="text-xs" style={{ color: 'var(--stone)' }}>또는</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--stone-light)' }} />
        </div>
        <button
          type="button"
          className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: '#FEE500', color: '#3C1E1E' }}
        >
          <span>💬</span> 카카오로 시작하기
        </button>
      </div>

      {/* 로그인 링크 */}
      <p className="text-center text-sm mt-6" style={{ color: 'var(--stone)' }}>
        이미 계정이 있어요?{' '}
        <Link href="/login" style={{ color: 'var(--rose)', fontWeight: 500 }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
