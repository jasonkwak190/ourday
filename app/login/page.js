'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';
import Icon from '@/components/Icon';

export default function LoginPage() {
  const router = useRouter();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showEmail,  setShowEmail]  = useState(false);

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
    <div style={{
      maxWidth: 430,
      margin: '0 auto',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--paper)',
      padding: '0 0 env(safe-area-inset-bottom)',
    }}>
      {/* ── 중앙 모노그램 히어로 ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 24,
      }}>
        {/* O·D 모노그램 */}
        <div style={{
          fontFamily: 'var(--font-serif-en)',
          fontWeight: 500,
          fontSize: 88,
          color: 'var(--ink)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span>O</span>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'var(--champagne)',
            display: 'inline-block',
            flexShrink: 0,
            marginBottom: 8,
          }} />
          <span>D</span>
        </div>

        {/* 워드마크 */}
        <div style={{
          fontFamily: 'var(--font-serif-en)',
          fontSize: 28,
          marginTop: 14,
          color: 'var(--ink)',
          letterSpacing: '0.02em',
        }}>
          <span style={{ fontWeight: 500 }}>O</span>
          <span style={{ fontStyle: 'italic', fontWeight: 400 }}>urday</span>
        </div>

        {/* 태그라인 */}
        <p style={{
          fontFamily: 'var(--font-serif-ko)',
          fontWeight: 500,
          fontSize: 13,
          color: 'var(--ink-3)',
          marginTop: 10,
          letterSpacing: 0,
        }}>
          두 사람의 기록이 한 권의 책이 됩니다
        </p>

        {/* 플러리시 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 20,
          color: 'var(--champagne)',
        }}>
          <span style={{ width: 40, height: 1, background: 'currentColor', opacity: 0.6, display: 'block' }} />
          <span style={{
            width: 6, height: 6,
            border: '1px solid currentColor',
            transform: 'rotate(45deg)',
            display: 'block',
            flexShrink: 0,
          }} />
          <span style={{ width: 40, height: 1, background: 'currentColor', opacity: 0.6, display: 'block' }} />
        </div>
      </div>

      {/* ── 하단 버튼 영역 ── */}
      <div style={{ padding: '0 24px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* OAuth 버튼 */}
        <OAuthButtons />

        {/* 구분선 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '4px 0',
        }}>
          <span style={{ flex: 1, height: 1, background: 'var(--rule-strong)' }} />
          <span style={{
            fontFamily: 'var(--font-serif-en)',
            fontStyle: 'italic',
            fontSize: 11,
            color: 'var(--ink-4)',
            letterSpacing: '0.08em',
          }}>· or ·</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule-strong)' }} />
        </div>

        {/* 이메일 로그인 토글 */}
        {!showEmail ? (
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowEmail(true)}
          >
            이메일로 계속
          </button>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                display: 'block',
                marginBottom: 6,
              }}>
                이메일
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <label style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}>
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
                  style={{ paddingRight: 40 }}
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
              <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--clay)', fontFamily: 'var(--font-serif-ko)', marginBottom: 12 }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>
        )}

        {/* 가입 링크 */}
        <p style={{ textAlign: 'center', fontSize: 12, marginTop: 8, color: 'var(--ink-3)' }}>
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
    </div>
  );
}
