/**
 * 업체 종류별 세부 라인 항목 디폴트 템플릿
 *
 * vendor 카드를 처음 펼칠 때 자동으로 채워짐.
 * 사용자가 안 쓰는 항목은 X로 삭제 가능, 새 항목은 + 로 추가 가능.
 *
 * 데이터 형식:
 *   line_items: [{ id, label, amount, source: 'default' | 'custom' }]
 *   amount: 만원 단위 (deposit/balance와 일치)
 */

export const VENDOR_LINE_TEMPLATES = {
  hall: [
    '식대 (인당)',
    '대관료',
    '꽃 장식',
    '사회자료',
    '축가',
    '음향·조명',
    '폐백실 사용료',
    '답례품',
  ],
  studio: [
    '본식 패키지',
    '원판',
    '추가 컷',
    '앨범 (대형)',
    '액자',
    '디지털 파일',
  ],
  dress: [
    '본식 드레스',
    '2부 드레스',
    '부케',
    '헬퍼비',
  ],
  makeup: [
    '신부 메이크업',
    '신부 헤어',
    '어머니 메이크업',
    '어머니 헤어',
    '헬퍼비',
  ],
  hanbok: [
    '신부 한복',
    '신랑 한복',
    '신부측 어머니 한복',
    '신랑측 어머니 한복',
  ],
  food: [
    '폐백 음식',
    '대기실 다과',
    '가족 식사',
  ],
  flower: [
    '부케',
    '부토니에',
    '어머니 코사지',
    '식장 꽃 장식',
  ],
  music: [
    '식전 영상',
    '본식 영상',
    '음향 시스템',
  ],
  travel: [
    '항공권',
    '숙박',
    '여행자 보험',
    '현지 경비',
  ],
  other: [],
};

/** 디폴트 라인 항목 객체 배열 생성 */
export function buildDefaultLineItems(vendorType) {
  const labels = VENDOR_LINE_TEMPLATES[vendorType] || [];
  return labels.map((label, idx) => ({
    id: `default-${vendorType}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    amount: 0,
    source: 'default',
  }));
}

/** 라인 합계 (amount === 0이면 미입력으로 간주, 합계에는 포함) */
export function sumLineItems(items) {
  return (items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
}
