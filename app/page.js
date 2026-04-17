import Link from 'next/link';

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

export default function LandingPage() {
  return (
    <div className="page-wrapper flex flex-col">
      {/* 헤더 로고 */}
      <header className="text-center pt-8 pb-6">
        <p
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--stone)' }}
        >
          우리의 날
        </p>
        <h1
          className="text-5xl font-extrabold tracking-tight"
          style={{ color: 'var(--toss-blue)' }}
        >
          Ourday
        </h1>
        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: 'var(--toss-text-secondary)' }}
        >
          결혼 준비, 둘이 함께라면<br />
          <span className="font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
            더 쉽고 행복하게
          </span>
        </p>
      </header>

      {/* 기능 카드 3개 */}
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
      <p
        className="text-center text-sm my-4"
        style={{ color: 'var(--stone)' }}
      >
        💍 이미 <strong style={{ color: 'var(--rose)' }}>1,200쌍</strong>의 커플이 함께하고 있어요
      </p>

      {/* CTA 버튼 */}
      <div className="flex flex-col gap-3 mt-auto pt-4">
        <Link href="/signup" className="btn-rose w-full text-center">
          시작하기
        </Link>
        <Link href="/login" className="btn-outline w-full text-center">
          로그인
        </Link>
      </div>
    </div>
  );
}
