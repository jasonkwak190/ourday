'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OnboardingProgress from '@/components/OnboardingProgress';

export default function SetupProfilePage() {
  const router = useRouter();
  const [name,    setName]    = useState('');
  const [role,    setRole]    = useState('groom');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // 이미 프로필이 있는 유저는 통과
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: profile } = await supabase
        .from('users').select('name, couple_id').eq('id', session.user.id).single();

      if (profile?.name) {
        router.push(profile.couple_id ? '/dashboard' : '/connect');
      }
    };
    check();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }

    // upsert — 혹시 이미 row가 있어도 안전하게 처리
    const { error: upsertErr } = await supabase
      .from('users')
      .upsert({ id: session.user.id, name: name.trim(), role }, { onConflict: 'id' });

    if (upsertErr) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    router.push('/connect');
  }

  return (
    <div className="page-wrapper flex flex-col">
      <OnboardingProgress current={1} />

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--toss-text-primary)' }}>
          딱 2가지만 알려주세요
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--toss-text-secondary)' }}>
          상대방에게 표시될 내 정보예요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 이름 */}
        <div>
          <label className="text-sm font-semibold block mb-2"
            style={{ color: 'var(--toss-text-secondary)' }}>
            이름
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        {/* 역할 */}
        <div>
          <label className="text-sm font-semibold block mb-2"
            style={{ color: 'var(--toss-text-secondary)' }}>
            나는요
          </label>
          <div className="flex gap-3">
            {[
              { value: 'groom', label: '신랑' },
              { value: 'bride', label: '신부' },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className="flex-1 font-semibold transition-all"
                style={{
                  height: 56, borderRadius: 16, fontSize: 15,
                  backgroundColor: role === r.value ? 'var(--toss-blue)' : 'var(--toss-bg)',
                  color: role === r.value ? 'white' : 'var(--toss-text-secondary)',
                  border: role === r.value ? 'none' : '1.5px solid var(--toss-border)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--toss-red)' }}>{error}</p>
        )}

        <button
          type="submit"
          className="btn-rose w-full mt-2"
          style={{ height: 56 }}
          disabled={loading}
        >
          {loading ? '저장 중...' : '시작하기 →'}
        </button>
      </form>
    </div>
  );
}
