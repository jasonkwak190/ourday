'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Icon from '@/components/Icon';

// Supabase 에러 메시지 → 한국어 변환
function toKoreanError(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '이미 가입된 이메일이에요. 로그인해주세요.';
  if (m.includes('invalid email'))
    return '올바른 이메일 형식이 아니에요.';
  if (m.includes('password'))
    return '비밀번호는 6자 이상이어야 해요.';
  if (m.includes('email') && m.includes('confirm'))
    return '이메일 인증이 필요해요. 받은 편지함을 확인해주세요.';
  if (m.includes('rate limit'))
    return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.';
  return '가입에 실패했어요. 다시 시도해주세요.';
}

export default function SignupPage() {
  const router   = useRouter();
  const [showEmail,   setShowEmail]   = useState(false);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [role,        setRole]        = useState('groom');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [agreed,      setAgreed]      = useState(false);
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    if (!agreed)                    { setError('이용약관 및 개인정보처리방침에 동의해주세요.'); return; }
    if (!name.trim())               { setError('이름을 입력해주세요.'); return; }
    if (password.length < 6)        { setError('비밀번호는 6자 이상이어야 해요.'); return; }
    if (password !== confirmPw)     { setError('비밀번호가 일치하지 않아요.'); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(toKoreanError(authError.message));
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId, name: name.trim(), role });

      if (insertError) {
        setError('프로필 저장에 실패했어요. 다시 시도해주세요.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push('/connect');
  }

  return (
    <div className="page-wrapper flex flex-col">
      {/* 모노그램 헤더 */}
      <div className="text-center mb-8">
        <div style={{
          fontFamily: 'var(--font-serif-en)',
          fontWeight: 500,
          fontSize: 56,
          color: 'var(--ink)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 10,
        }}>
          <span>O</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--champagne)', display: 'inline-block', marginBottom: 4 }} />
          <span>D</span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif-en)', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
          <span style={{ fontWeight: 500 }}>O</span>
          <span style={{ fontStyle: 'italic' }}>urday</span>
        </div>
        <p style={{ fontFamily: 'var(--font-serif-ko)', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          함께 시작하는 첫 걸음
        </p>
      </div>

      {/* 개인정보 동의 */}
      <label
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
          backgroundColor: agreed ? 'var(--champagne-wash)' : 'var(--toss-bg)',
          border: `1.5px solid ${agreed ? 'var(--champagne)' : 'var(--toss-border)'}`,
          transition: 'all 0.15s', marginBottom: 4,
        }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--champagne)', flexShrink: 0, cursor: 'pointer' }}
        />
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>[필수]&nbsp;</span>
          <span style={{ color: 'var(--ink-2)' }}>
            서비스 이용을 위한{' '}
            <Link href="/terms" target="_blank"
              style={{ color: 'var(--champagne)', fontWeight: 600, textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}>
              이용약관
            </Link>
            {' '}및{' '}
            <Link href="/privacy" target="_blank"
              style={{ color: 'var(--champagne)', fontWeight: 600, textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}>
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            이메일·이름을 수집하며, 탈퇴 시 즉시 파기됩니다.
          </p>
        </div>
        {agreed && (
          <ShieldCheck size={18} color="var(--champagne)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        )}
      </label>

      {/* OAuth 버튼 */}
      <div style={{ opacity: agreed ? 1 : 0.45, pointerEvents: agreed ? 'auto' : 'none', transition: 'opacity 0.2s', marginTop: 16 }}>
        <OAuthButtons />
      </div>
      {!agreed && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>
          위 약관에 동의 후 진행할 수 있어요
        </p>
      )}

      {/* 이메일 가입 토글 */}
      <div className="flex items-center gap-3 mt-8 mb-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
        <button
          type="button"
          onClick={() => setShowEmail(v => !v)}
          className="text-xs font-medium"
          style={{ color: 'var(--toss-text-tertiary)', background: 'none', border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {showEmail ? '이메일 가입 접기 ▲' : '이메일로 가입하기 ▼'}
        </button>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
      </div>

      {showEmail && (
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          {/* 이름 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>이름</label>
            <input className="input-field" type="text" placeholder="홍길동"
              value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>이메일</label>
            <input className="input-field" type="email" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPw ? 'text' : 'password'}
                placeholder="6자 이상"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: 48 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-text-tertiary)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>비밀번호 확인</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showConfirm ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력해주세요"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                style={{
                  paddingRight: 48,
                  borderColor: confirmPw && confirmPw !== password ? 'var(--toss-red)' : undefined,
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-text-tertiary)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* 실시간 불일치 피드백 */}
            {confirmPw && password !== confirmPw && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--toss-red)' }}>
                비밀번호가 일치하지 않아요
              </p>
            )}
            {confirmPw && password === confirmPw && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--toss-green)' }}>
                <span className="flex items-center gap-1"><Icon name="check" size={12} color="currentColor" />비밀번호가 일치해요</span>
              </p>
            )}
          </div>

          {/* 역할 */}
          <div>
            <label className="text-xs font-semibold block mb-2"
              style={{ color: 'var(--toss-text-secondary)' }}>나는요</label>
            <div className="flex gap-3">
              {[
                { value: 'groom', label: '신랑', icon: 'groom' },
                { value: 'bride', label: '신부', icon: 'bride' },
              ].map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                  className="flex-1 transition-all"
                  style={{
                    height: 64, borderRadius: 16, fontSize: 14, fontWeight: 500,
                    backgroundColor: role === r.value ? 'var(--ink)' : 'var(--paper)',
                    color: role === r.value ? 'var(--ivory)' : 'var(--ink-3)',
                    border: `1.5px solid ${role === r.value ? 'var(--ink)' : 'var(--rule)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 6, cursor: 'pointer',
                  }}>
                  <Icon name={r.icon} size={22} color={role === r.value ? 'var(--ivory)' : 'var(--ink-3)'} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
          )}

          <button type="submit" className="btn-rose w-full" style={{ height: 52 }}
            disabled={loading || !agreed || (confirmPw.length > 0 && password !== confirmPw)}>
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>
      )}

      <p className="text-center text-xs mt-6" style={{ color: 'var(--toss-text-tertiary)' }}>
        이미 계정이 있어요?{' '}
        <Link href="/login" style={{ color: 'var(--toss-blue)', fontWeight: 600 }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
