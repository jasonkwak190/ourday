'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';
import Icon from '@/components/Icon';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.');
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('couple_id, name')
        .eq('id', userId)
        .maybeSingle();

      if (!userRecord?.name) {
        router.push('/setup-profile');
        return;
      }
      if (!userRecord?.couple_id) {
        router.push('/connect');
        return;
      }
    }

    router.push('/dashboard');
  }

  return (
    <div className="page-wrapper flex flex-col">
      {/* 로고 */}
      <div className="text-center mb-10 mt-4">
        <Icon name="rings" size={40} color="var(--champagne)" style={{ margin: '0 auto 14px' }} />
        <h1 style={{
          fontFamily: 'var(--font-serif-en)',
          fontSize: 32,
          fontWeight: 400,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          margin: '0 0 6px',
        }}>
          <span style={{ fontWeight: 500 }}>O</span>urday
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif-en)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--ink-3)',
          letterSpacing: '0.05em',
        }}>
          다시 만나서 반가워요
        </p>
      </div>

      {/* OAuth 버튼 */}
      <OAuthButtons />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--rule)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.06em', fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>or email</span>
        <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--rule)' }} />
      </div>

      {/* 이메일 폼 */}
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
            이메일
          </label>
          <input
            className="input-field"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              비밀번호
            </label>
            <Link href="/reset-password" style={{
              fontSize: 12,
              color: 'var(--champagne-2)',
              fontFamily: 'var(--font-serif-en)',
              fontStyle: 'italic',
              textDecoration: 'none',
              borderBottom: '1px solid var(--champagne)',
              paddingBottom: 1,
            }}>
              찾기
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              type={showPw ? 'text' : 'password'}
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 4,
              }}
            >
              <Icon name={showPw ? 'eye-off' : 'eye'} size={18} color="var(--ink-4)" />
            </button>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--clay)', fontFamily: 'var(--font-serif-ko)' }}>{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, marginTop: 24, color: 'var(--ink-3)' }}>
        계정이 없어요?{' '}
        <Link href="/signup" style={{
          color: 'var(--ink)',
          fontWeight: 500,
          borderBottom: '1px solid var(--champagne)',
          paddingBottom: 1,
          textDecoration: 'none',
        }}>
          가입하기
        </Link>
      </p>
    </div>
  );
}
