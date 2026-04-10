import BottomNav from '@/components/BottomNav';

const CATEGORIES = [
  { icon: '🎎', title: '폐백 & 예절',    desc: '전통 혼례 예절과 폐백 준비 방법' },
  { icon: '💌', title: '청첩장',          desc: '청첩장 문구, 디자인, 발송 시기' },
  { icon: '📋', title: '계약 주의사항',   desc: '웨딩홀·스드메 계약 시 확인할 것들' },
  { icon: '🎁', title: '예단 & 예물',    desc: '예단·예물 품목과 금액 가이드' },
];

const POPULAR_GUIDES = [
  {
    emoji: '🔥',
    title: '웨딩홀 계약 전 반드시 확인해야 할 10가지',
    tag: '계약',
    tagCls: 'tag-rose',
    desc: '취소 위약금, 인원 추가 비용, 주차 조건 등 놓치기 쉬운 항목들을 정리했어요.',
  },
  {
    emoji: '✨',
    title: '스드메 패키지 가격 비교 가이드 2024',
    tag: '스드메',
    tagCls: 'tag-purple',
    desc: '드레스·헤어메이크업·스튜디오를 분리 계약할 때 vs 패키지로 묶을 때 비용 차이',
  },
  {
    emoji: '📅',
    title: '결혼 준비 12개월 타임라인 총정리',
    tag: '일정',
    tagCls: 'tag-green',
    desc: '언제 무엇을 해야 하는지 한눈에 보는 월별 체크리스트예요.',
  },
];

export default function GuidePage() {
  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        📖 정보 & 예절 가이드
      </h1>

      {/* 검색 */}
      <div className="relative mb-6">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: 'var(--stone)' }}
        >
          🔍
        </span>
        <input
          className="input-field pl-10"
          type="text"
          placeholder="궁금한 내용을 검색해보세요"
          readOnly
        />
      </div>

      {/* 카테고리 2x2 */}
      <section className="mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>카테고리</p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              className="card cursor-pointer hover:shadow-md transition-shadow"
              style={{ padding: '1rem' }}
            >
              <p className="text-2xl mb-2">{cat.icon}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {cat.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                {cat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 인기 가이드 */}
      <section>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>인기 가이드</p>
        <div className="flex flex-col gap-3">
          {POPULAR_GUIDES.map((g) => (
            <div
              key={g.title}
              className="card cursor-pointer hover:shadow-md transition-shadow flex items-start gap-3"
            >
              <span className="text-2xl">{g.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`tag ${g.tagCls}`}>{g.tag}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {g.title}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                  {g.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav active="guide" />
    </div>
  );
}
