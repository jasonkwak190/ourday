'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import Icon from '@/components/Icon';

const CATEGORIES = [
  {
    icon: 'bouquet',
    title: '폐백 & 예절',
    desc: '전통 혼례 예절과 폐백 준비 방법',
    content: [
      {
        heading: '폐백 음식 종류와 의미',
        items: [
          '🌰 대추 — 자손 번창, 부귀장수 기원. 꼭지 제거 후 잣을 박아 실에 꿰어 준비',
          '🌰 밤 — 훌륭한 자식을 얻고 조상을 잘 섬기라는 의미',
          '🐔 닭(통닭구이) — 다산, 성실함, 부지런함의 상징',
          '🥩 육포 — 서울·수도권 지역 폐백의 기본 품목',
          '🍡 한과·구절판 — 정성을 담은 전통 간식',
        ],
      },
      {
        heading: '폐백 절차 순서',
        items: [
          '① 시부모님이 먼저 절을 받음 (시조부모보다 우선)',
          '② 시조부모 → 백숙부모 → 고모 내외 → 외숙 내외 순',
          '③ 동항렬 형제자매와는 맞절',
          '④ 신랑·신부가 큰절 후 술을 올림',
          '⑤ 시아버지가 덕담 후 치마에 대추·밤을 던져줌 (다산과 복 기원)',
        ],
      },
      {
        heading: '주의사항',
        items: [
          '폐백실 사용료가 별도인 경우 많으므로 계약 시 반드시 확인',
          '폐백 음식은 미리 전문 업체에 주문 (당일 준비 불가)',
          '이바지 음식(신부 측 → 신랑 집)과 혼동하지 않도록 주의',
          '절하는 순서와 예절은 사전에 연습 권장',
        ],
      },
    ],
  },
  {
    icon: 'invite',
    title: '청첩장',
    desc: '청첩장 문구, 디자인, 발송 시기',
    content: [
      {
        heading: '발송 시기',
        items: [
          '인쇄 주문: 결혼식 2~3개월 전 디자인 확정, 제작 2~3주 소요',
          '발송 시기: 결혼식 1~2개월 전이 일반적',
          '부모님 세대 지인에게는 실물 청첩장 직접 전달이 예의',
          '친구·직장동료에게는 모바일 청첩장 병행 가능',
        ],
      },
      {
        heading: '청첩장 문구 예시',
        items: [
          '"저희 두 사람이 사랑의 결실을 맺고 하나가 되는 자리에 귀한 발걸음을 초대합니다"',
          '"바쁘시겠지만 오셔서 저희의 시작을 함께 축복해 주신다면 큰 기쁨이 되겠습니다"',
          '계좌번호 안내: \'마음을 전하실 곳\'으로 간결하게 표기',
        ],
      },
      {
        heading: '모바일 vs 실물 청첩장',
        items: [
          '모바일: 저렴(1~5만 원대), 카카오톡·SNS 공유, 지도·계좌번호 바로 연결',
          '실물: 정성·격식 표현 가능, 부모님 세대·친척·어른께 적합',
          '고급 지류·특수 인쇄(박, 엠보)로 고급감 연출 가능',
          '셀프 제작: 달팽 모바일초대장, 잇츠카드 등 플랫폼 활용',
        ],
      },
    ],
  },
  {
    icon: 'checklist',
    title: '계약 주의사항',
    desc: '웨딩홀·스드메 계약 시 확인할 것들',
    content: [
      {
        heading: '웨딩홀 계약 전 10가지 체크',
        items: [
          '① 식대 단가 — 부가세·봉사료 포함 여부, 음주류·후식 별도 여부',
          '② 최소 보증 인원 — 예상 하객 수보다 보증 인원이 많으면 손해',
          '③ 예식 방식 — 단독 예식 vs 동시 예식 여부, 예식 진행 시간 보장 여부 (60~90분)',
          '④ 부대시설 — 신부대기실, 폐백실, 메이크업실 포함 여부 및 추가비용',
          '⑤ 주차장 — 무료주차 가능 시간, 대수, 주차비 부담 주체',
          '⑥ 서비스 포함 항목 — 음향·조명·꽃장식·사회자 포함 여부',
          '⑦ 당일 계약 혜택 — 식대할인, 전문사회자, 현악 서비스 등',
          '⑧ 위약금·취소·변경 조건 — 서면으로 명시 요구',
          '⑨ 제휴업체 강제 이용 여부 — 특정 스드메 강제 사용 조건 확인',
          '⑩ 시식 진행 — 최소 3~4곳 비교 후 음식 맛 직접 확인',
        ],
      },
      {
        heading: '스드메 계약 주의사항',
        items: [
          '추가금 항목 사전 확인 필수 (앨범 페이지 추가, 본식 헬퍼, 혼주 헤어·메이크업 등)',
          '기본 패키지만 보고 계약하면 최종 비용이 400만 원 이상 늘어날 수 있음',
          '2025년부터 한국소비자원 \'참가격\' 사이트에서 지역별 스드메 가격 비교 가능',
          '표준계약서 확인 — 기본·선택 품목 구분 명시 의무화',
          '헤어·메이크업 업그레이드, 원본 파일, 추가 피팅 등 옵션별 가격 사전 문의',
        ],
      },
      {
        heading: '위약금 기준 (일반적)',
        items: [
          '6개월 이전 취소: 계약금 환불 가능한 경우 多',
          '3~6개월 전 취소: 계약금 일부 또는 전액 몰취',
          '1개월 이내 취소: 위약금 30~50% 이상 발생 가능',
          '계약서에 위약금 조건이 없으면 반드시 협의 후 추가 기재 요청',
        ],
      },
    ],
  },
  {
    icon: 'gift',
    title: '예단 & 예물',
    desc: '예단·예물 품목과 금액 가이드',
    content: [
      {
        heading: '예단 (신부 → 신랑 집안)',
        items: [
          '전통 품목: 명주(비단) 천, 이불 세트, 은수저 세트, 반상기, 방짜유기',
          '최근 트렌드: 현금 예단비(예단봉투)로 간소화하는 경향',
          '평균 예단 비용 (2024년 기준): 약 566만 원',
          '예단비는 홀수 금액으로 준비 (500만·700만·1,000만 원 등)',
          '시댁과 사전 협의 후 결정 — 간소화·생략하는 커플도 증가',
        ],
      },
      {
        heading: '예물 (신랑 ↔ 신부 상호 교환)',
        items: [
          '커플링(결혼반지): 필수 항목, 플래티넘·골드·로즈골드 등',
          '신부 예물: 다이아몬드 반지, 귀금속 세트(목걸이·귀걸이·팔찌)',
          '신랑 예물: 명품 시계 (평균 500만 원 전후), 지갑, 벨트',
          '예물 평균 비용 (2024년 기준): 약 530만 원',
        ],
      },
      {
        heading: '최근 트렌드',
        items: [
          '명품 브랜드보다 심플하고 실용적인 미니멀 예물 선호',
          '커플링만 맞추고 나머지 예물을 생략하는 커플 증가',
          '다이아몬드 대신 컬러 스톤·모이사나이트 등 대안 선택',
          '양가 협의로 예물 간소화 또는 현금 대체 트렌드',
        ],
      },
    ],
  },
];

const POPULAR_GUIDES = [
  {
    emoji: 'venue',
    title: '웨딩홀 계약 전 반드시 확인해야 할 10가지',
    tag: '계약',
    tagCls: 'tag-rose',
    desc: '취소 위약금, 인원 추가 비용, 주차 조건 등 놓치기 쉬운 항목들을 정리했어요.',
    content: [
      {
        heading: '꼭 확인해야 할 항목',
        items: [
          '① 식대 단가 구성 — 부가세·봉사료 포함 여부, 음주류·후식 별도 여부',
          '② 최소 보증 인원 — 예상 하객 수 대비 현실적으로 산정',
          '③ 예식 방식 — 단독 예식 여부, 진행 시간 보장 (보통 60~90분)',
          '④ 부대시설 — 신부대기실, 폐백실, 메이크업실 포함 여부',
          '⑤ 주차장 조건 — 무료주차 가능 시간, 주차비 부담 주체',
          '⑥ 서비스 포함 항목 — 음향·조명·꽃장식·사회자 포함 여부',
          '⑦ 당일 계약 혜택 — 계약 전 꼼꼼히 비교 후 결정',
          '⑧ 위약금·취소·변경 조건 — 서면으로 명시',
          '⑨ 제휴업체 강제 이용 — 특정 스드메 강제 사용 조건 확인',
          '⑩ 시식 진행 — 최소 3~4곳 비교, 음식 맛 직접 확인',
        ],
      },
      {
        heading: '위약금 기준',
        items: [
          '6개월 이전 취소: 계약금 환불 가능한 경우 多',
          '3~6개월 전 취소: 계약금 일부 또는 전액 몰취',
          '1개월 이내 취소: 위약금 30~50% 이상 발생',
        ],
      },
    ],
  },
  {
    emoji: 'diamond',
    title: '스드메 패키지 가격 비교 가이드 2025',
    tag: '스드메',
    tagCls: 'tag-purple',
    desc: '드레스·헤어메이크업·스튜디오를 분리 계약할 때 vs 패키지로 묶을 때 비용 차이',
    content: [
      {
        heading: '2025년 전국 평균 가격',
        items: [
          '스드메 패키지 중간 가격: 약 292만 원',
          '웨딩홀 + 스드메 합산 평균: 약 2,074만 원',
          '서울 강남: 3,336만 원 (웨딩홀+스드메)',
          '서울 기타: 2,703만 원',
          '경기도: 1,881만 원',
          '부산: 334만 원 (스드메 단독)',
          '인천: 222만 원 (가장 저렴)',
        ],
      },
      {
        heading: '추가금 절감 팁',
        items: [
          '박람회보다 개별 직접 투어로 가격 협상',
          '추가 앨범 페이지, 원본 파일, 헬퍼 등 불필요한 옵션 제외',
          '한국소비자원 \'참가격\' 사이트에서 지역별 가격 사전 조회',
          '비수기(겨울 12~2월) 결혼 시 스드메 할인 협상 유리',
          '스드메 정찰제 적용 업체 우선 선택',
        ],
      },
    ],
  },
  {
    emoji: 'calendar',
    title: '결혼 준비 12개월 타임라인 총정리',
    tag: '일정',
    tagCls: 'tag-green',
    desc: '언제 무엇을 해야 하는지 한눈에 보는 월별 체크리스트예요.',
    content: [
      {
        heading: '월별 타임라인',
        items: [
          '🗓 D-12~10개월: 결혼 날짜·장소 결정, 전체 예산 설계, 웨딩홀 투어 및 계약 (인기홀 1년 전 마감)',
          '🗓 D-9~7개월: 웨딩플래너 선정, 스드메 업체 투어·계약, 추가금·위약금 조건 확인',
          '🗓 D-6~4개월: 예복 맞춤·대여, 혼수 가전·가구 주문, 예단·예물 확정, 신혼여행 예약',
          '🗓 D-3~2개월: 청첩장 디자인 확정·주문, 하객 명단 정리, 사회자·축가자 섭외',
          '🗓 D-1개월: 청첩장 발송 (모바일+실물 병행), 드레스·예복 최종 피팅',
          '🗓 D-2주: 예식 리허설, 식순·진행 시나리오 최종 확인, 좌석 배치도 완성',
          '🗓 D-1주: 폐백 음식 주문 확인, 혼인신고서 준비, 신혼여행 짐 준비',
        ],
      },
    ],
  },
];

function ContentSection({ content }) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      {content.map((section) => (
        <div key={section.heading}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
            {section.heading}
          </p>
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => (
              <li key={item} className="text-xs flex gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                <span style={{ flexShrink: 0 }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  const [openCat, setOpenCat] = useState(null);
  const [openGuide, setOpenGuide] = useState(null);

  return (
    <div className="page-wrapper">
      <div className="mb-4">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>정보 &amp; 가이드</h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>wedding guide</p>
      </div>

      {/* 카테고리 2x2 */}
      <section className="mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>카테고리</p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              className="card cursor-pointer"
              style={{
                padding: '1rem',
                border: `1.5px solid ${openCat === cat.title ? 'var(--rose)' : 'transparent'}`,
              }}
              onClick={() => setOpenCat(openCat === cat.title ? null : cat.title)}
            >
              <div className="mb-2"><Icon name={cat.icon} size={24} color="var(--champagne)" /></div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{cat.title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{cat.desc}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--rose)' }}>
                {openCat === cat.title ? '접기 ▲' : '자세히 ▼'}
              </p>
            </div>
          ))}
        </div>

        {/* 카테고리 상세 내용 */}
        {openCat && (() => {
          const cat = CATEGORIES.find((c) => c.title === openCat);
          return cat ? (
            <div className="card mt-3" style={{ border: '1.5px solid var(--rose)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon name={cat.icon} size={20} color="var(--champagne)" />
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{cat.title}</p>
              </div>
              <ContentSection content={cat.content} />
            </div>
          ) : null;
        })()}
      </section>

      {/* 인기 가이드 */}
      <section>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>인기 가이드</p>
        <div className="flex flex-col gap-3">
          {POPULAR_GUIDES.map((g) => (
            <div key={g.title} className="card cursor-pointer" style={{ border: `1.5px solid ${openGuide === g.title ? 'var(--rose)' : 'transparent'}` }}
              onClick={() => setOpenGuide(openGuide === g.title ? null : g.title)}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0"><Icon name={g.emoji} size={24} color="var(--champagne)" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`tag ${g.tagCls}`}>{g.tag}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{g.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{g.desc}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--rose)' }}>
                    {openGuide === g.title ? '접기 ▲' : '자세히 보기 ▼'}
                  </p>
                </div>
              </div>
              {openGuide === g.title && (
                <div style={{ borderTop: '1px solid var(--beige)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                  <ContentSection content={g.content} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <BottomNav active="guide" />
    </div>
  );
}
