'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';
import { ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router  = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [role,    setRole]    = useState('groom');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [agreed,  setAgreed]  = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!agreed)              { setError('개인정보처리방침에 동의해주세요.'); return; }
    if (!name.trim())         { setError('이름을 입력해주세요.'); return; }
    if (password.length < 6)  { setError('비밀번호는 6자 이상이어야 해요.'); return; }

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
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--toss-blue)' }}>
          Ourday
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
          함께 시작하는 첫 걸음 💍
        </p>
      </div>

      {/* 개인정보 동의 */}
      <label
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
          backgroundColor: agreed ? '#eaf4ff' : 'var(--toss-bg)',
          border: `1.5px solid ${agreed ? '#3182f6' : 'var(--toss-border)'}`,
          transition: 'all 0.15s', marginBottom: 4,
        }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 2, width: 18, height: 18, accentColor: '#3182f6', flexShrink: 0, cursor: 'pointer' }}
        />
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700, color: '#191f28' }}>[필수]&nbsp;</span>
          <span style={{ color: '#4e5968' }}>
            서비스 이용을 위한{' '}
            <Link href="/privacy" target="_blank"
              style={{ color: '#3182f6', fontWeight: 600, textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}>
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
          <p style={{ fontSize: 11, color: '#8b95a1', marginTop: 4 }}>
            이메일·이름을 수집하며, 탈퇴 시 즉시 파기됩니다.
          </p>
        </div>
        {agreed && (
          <ShieldCheck size={18} color="#3182f6" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        )}
      </label>

      {/* OAuth 버튼 — 메인 */}
      <div style={{ opacity: agreed ? 1 : 0.45, pointerEvents: agreed ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
        <OAuthButtons />
      </div>
      {!agreed && (
        <p style={{ fontSize: 12, color: '#8b95a1', textAlign: 'center', marginTop: 4 }}>
          위 약관에 동의 후 진행할 수 있어요
        </p>
      )}

      {/* 이메일 가입 토글 */}
      <div className="flex items-center gap-3 my-5">
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
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>이름</label>
            <input className="input-field" type="text" placeholder="홍길동"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>이메일</label>
            <input className="input-field" type="email" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>비밀번호</label>
            <input className="input-field" type="password" placeholder="6자 이상"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-2"
              style={{ color: 'var(--toss-text-secondary)' }}>나는요</label>
            <div className="flex gap-3">
              {[
                { value: 'groom', label: '신랑 🤵' },
                { value: 'bride', label: '신부 👰' },
              ].map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                  className="flex-1 font-semibold transition-all"
                  style={{
                    height: 52, borderRadius: 16, fontSize: 14,
                    backgroundColor: role === r.value ? 'var(--toss-blue)' : 'var(--toss-bg)',
                    color: role === r.value ? 'white' : 'var(--toss-text-secondary)',
                    border: role === r.value ? 'none' : '1.5px solid var(--toss-border)',
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
          )}

          <button type="submit" className="btn-rose w-full" style={{ height: 52 }} disabled={loading || !agreed}>
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
