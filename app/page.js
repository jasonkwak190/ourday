import Link from 'next/link';
import OAuthButtons from '@/components/OAuthButtons';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: '📅',
    title: 'D-day 타임라인',
    desc: '결혼 준비 항목을 날짜별로 관리하고 두 분이 함께 체크해요.',
  },
  {
    icon: '💰',
    title: '예산 관리',
    desc: '전체 예산과 항목별 지출을 한눈에 확인할 수 있어요.',
  },
  {
    icon: '💬',
    title: '의견 조율',
    desc: '신랑·신부 각자의 의견을 남기고 함께 결정을 내려요.',
  },
];

async function getCoupleCount() {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/couples?select=id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
        cache: 'no-store',
      }
    );
    const cr = res.headers.get('content-range') || '';
    const match = cr.match(/\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

export default async function LandingPage() {
  const coupleCount = await getCoupleCount();

  return (
    <div className="page-wrapper flex flex-col">
      {/* 헤더 */}
      <header className="text-center pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--stone)' }}>
          우리의 날
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight" style={{ color: 'var(--toss-blue)' }}>
          Ourday
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--toss-text-secondary)' }}>
          결혼 준비, 둘이 함께라면<br />
          <span className="font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
            더 쉽고 행복하게
          </span>
        </p>
      </header>

      {/* 기능 카드 */}
      <section className="flex flex-col gap-3 my-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card flex items-start gap-4">
            <span className="text-2xl mt-0.5">{f.icon}</span>
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--ink)' }}>
                {f.title}
              </p>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 소셜 프루프 */}
      {coupleCount > 0 && (
        <p className="text-center text-sm my-2" style={{ color: 'var(--stone)' }}>
          💍 현재 <strong style={{ color: 'var(--rose)' }}>{coupleCount.toLocaleString('ko-KR')}쌍</strong>의 커플이 함께하고 있어요
        </p>
      )}

      {/* CTA — OAuth 메인, 이메일 보조 */}
      <div className="flex flex-col gap-3 mt-auto pt-6">
        <OAuthButtons />

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
          <span className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>또는</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--toss-border)' }} />
        </div>

        <Link href="/signup" className="btn-outline w-full text-center"
          style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, borderRadius: 16 }}>
          이메일로 시작하기
        </Link>
        <p className="text-center text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
          이미 계정이 있어요?{' '}
          <Link href="/login" style={{ color: 'var(--toss-blue)', fontWeight: 600 }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
