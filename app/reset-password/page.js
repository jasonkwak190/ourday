'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });

    setLoading(false);
    if (err) {
      setError('이메일 전송에 실패했어요. 다시 시도해주세요.');
    } else {
      setSent(true);
    }
  }

  return (
    <div className="page-wrapper flex flex-col">
      <Link href="/login"
        className="flex items-center gap-1.5 mb-8 text-sm font-medium self-start"
        style={{ color: 'var(--toss-text-tertiary)' }}>
        <ArrowLeft size={16} />
        로그인으로
      </Link>

      <div className="flex items-center justify-center mb-6"
        style={{ width: 56, height: 56, borderRadius: 16,
          backgroundColor: 'var(--toss-blue-light)', alignSelf: 'center' }}>
        <Mail size={24} color="var(--toss-blue)" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
          비밀번호 찾기
        </h1>
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
          가입한 이메일로 재설정 링크를 보내드려요
        </p>
      </div>

      {sent ? (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-4">
            <CheckCircle size={48} color="var(--toss-green)" />
          </div>
          <p className="text-base font-bold mb-2" style={{ color: 'var(--toss-text-primary)' }}>
            이메일을 확인해주세요
          </p>
          <p className="text-sm mb-1" style={{ color: 'var(--toss-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--toss-blue)' }}>{email}</span>
          </p>
          <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>
            재설정 링크를 전송했어요. 이메일 앱을 열어 링크를 클릭하세요.
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--toss-text-tertiary)' }}>
            이메일이 오지 않았다면 스팸함을 확인하거나
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-xs mt-1 font-semibold"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-blue)' }}>
            다시 보내기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--toss-text-secondary)' }}>
              이메일
            </label>
            <input
              className="input-field"
              type="email"
              placeholder="가입한 이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
          )}

          <button type="submit" className="btn-rose w-full" disabled={loading}
            style={{ height: 52 }}>
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>
      )}
    </div>
  );
}
