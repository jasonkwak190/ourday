'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PageLoader from '@/components/PageLoader';
import { useCouple } from '@/lib/useCouple';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';
import {
  CheckSquare, List, CalendarDays,
  ChevronLeft, ChevronRight, Heart, Building2,
  Calendar, Clock, HelpCircle, Edit3, Trash2,
  FileText,
} from 'lucide-react';

/* ─── 상수 ───────────────────────────────────────────────────── */
// due_months_before 숫자 → 기간 라벨 역매핑
const MONTHS_TO_PERIOD = {
  12: '12개월 전', 10: '10개월 전', 8: '8개월 전',
  6: '6개월 전',   4: '4개월 전',  3: '3개월 전',
  2: '2개월 전',   1: '1개월 전',
  0.5: 'D-2주', 0.25: 'D-1주',
};

const PERIOD_OFFSET = {
  '12개월 전': { months: -12 }, '10개월 전': { months: -10 },
  '8개월 전':  { months: -8  }, '6개월 전':  { months: -6  },
  '4개월 전':  { months: -4  }, '3개월 전':  { months: -3  },
  '2개월 전':  { months: -2  }, '1개월 전':  { months: -1  },
  'D-2주':     { days: -14   }, 'D-1주':     { days: -7    },
};

const TIME_PERIODS = [
  { label: '12개월 전', value: 12 }, { label: '10개월 전', value: 10 },
  { label: '8개월 전',  value: 8  }, { label: '6개월 전',  value: 6  },
  { label: '4개월 전',  value: 4  }, { label: '3개월 전',  value: 3  },
  { label: '2개월 전',  value: 2  }, { label: '1개월 전',  value: 1  },
  { label: 'D-2주',    value: 0.5 }, { label: 'D-1주',    value: 0.25 },
];

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose'  },
  both:  { label: '둘다', cls: 'tag-green' },
};
const ASSIGNED_OPTIONS = ['both', 'groom', 'bride'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ─── 날짜 유틸 ─────────────────────────────────────────────── */
function getPeriodDate(weddingDateStr, period) {
  if (!weddingDateStr || !period) return null;
  const d = new Date(weddingDateStr);
  const offset = PERIOD_OFFSET[period];
  if (!offset) return null;
  if (offset.months) {
    d.setMonth(d.getMonth() + offset.months);
    d.setDate(1); // 기간 항목은 해당 월 1일로 표시
  }
  if (offset.days) d.setDate(d.getDate() + offset.days);
  return d;
}
function isSameMonth(d, y, m) {
  return d.getFullYear() === y && d.getMonth() === m;
}
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}
function fmtShort(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}
// 아이템의 실제 기한 날짜 반환 (due_date 우선, 없으면 period 계산)
function getItemDate(item, weddingDate) {
  if (item.due_date) return new Date(item.due_date);
  const period = MONTHS_TO_PERIOD[item.due_months_before];
  return getPeriodDate(weddingDate, period);
}
// 아이템의 시기 표시 텍스트
function getItemDueLabel(item, weddingDate) {
  if (item.due_date) {
    return fmtDate(item.due_date);
  }
  if (item.due_months_before !== null && item.due_months_before !== undefined) {
    const period = MONTHS_TO_PERIOD[item.due_months_before];
    if (!period) return '';
    if (weddingDate) {
      const d = getPeriodDate(weddingDate, period);
      if (d) return `${period} · ${fmtShort(d)}`;
    }
    return period;
  }
  return '미정';
}

/* ─── 캘린더 이벤트 빌더 (버그 수정 + due_date 지원) ─────────── */
function buildCalEvents(year, month, weddingDate, checkItems, vendors) {
  const result = [];
  if (!weddingDate) return result;

  // 결혼식 당일
  const wd = new Date(weddingDate);
  if (isSameMonth(wd, year, month)) {
    result.push({ date: wd, title: '결혼식 당일', sub: '축하해요!',
      color: 'var(--toss-red)', Icon: Heart, badge: 'D-Day' });
  }

  // 특정 날짜 지정 아이템 (개별 표시)
  checkItems.filter(i => i.due_date).forEach(item => {
    const d = new Date(item.due_date);
    if (!isSameMonth(d, year, month)) return;
    result.push({
      date: d, title: item.title,
      sub: ASSIGNED_LABELS[item.assigned_to]?.label || '둘다',
      color: item.is_done ? 'var(--toss-text-tertiary)' : 'var(--toss-blue)',
      Icon: CheckSquare,
      badge: item.is_done ? '완료' : null,
    });
  });

  // 기간 기반 아이템 (그룹 표시) — due_months_before 사용 (버그 수정)
  const periodGroups = {};
  checkItems.filter(i => !i.due_date && i.due_months_before !== null && i.due_months_before !== undefined)
    .forEach(item => {
      const period = MONTHS_TO_PERIOD[item.due_months_before];
      const d = getPeriodDate(weddingDate, period);
      if (!d || !isSameMonth(d, year, month)) return;
      const key = item.due_months_before;
      if (!periodGroups[key]) periodGroups[key] = { date: d, label: period, total: 0, done: 0 };
      periodGroups[key].total++;
      if (item.is_done) periodGroups[key].done++;
    });

  Object.values(periodGroups).forEach(({ date, label, total, done }) => {
    result.push({ date, title: `${label} 준비 항목`, sub: `${done}/${total}개 완료`,
      color: 'var(--toss-blue)', Icon: CheckSquare,
      badge: done === total ? '완료' : `${total - done}개 남음` });
  });

  // 업체 잔금
  vendors.forEach(v => {
    if (!v.balance_due || v.contract_status === 'done') return;
    const d = new Date(v.balance_due);
    if (!isSameMonth(d, year, month)) return;
    const dday = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    result.push({ date: d, title: `${v.name} 잔금 납부`, sub: v.type,
      color: 'var(--toss-yellow)', Icon: Building2,
      badge: dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '지남' });
  });

  return result;
}

/* ─── 웨딩홀 투어 체크리스트 ─────────────────────────────────── */
const VENUE_CHECKLIST = [
  { category: '비용', items: ['대관료 (부가세 포함 여부)', '식대 (대인/소인 구분)', '추가 인원 식대 적용 방식', '현금 결제 시 추가 할인 혜택', '부가세 및 봉사료 포함 여부'] },
  { category: '계약', items: ['보증 인원 및 좌석 수', '계약금 / 중도금 / 잔금', '계약금 환불 기간 (100%/70%/50%/불가)', '당일 계약 혜택 확인 (사회자·포토테이블·플라워샤워 등)'] },
  { category: '촬영', items: ['본식스냅·DVD 연계 업체 유무', '외부 업체 이용 가능 여부'] },
  { category: '식사', items: ['음식 가짓수 (뷔페/코스/한식)', '식사 이용 시간', '주류·음료 서비스 여부 및 단가', '혼주 식사 공간', '시식 인원 및 가능 시기'] },
  { category: '시설', items: ['예식 진행 시간', '층고 / 버진로드 길이', '신부대기실 내 화장실 유무', '혼주 대기실·락커', '포토테이블 위치 및 비용', '꽃장식 종류 (생화/조화)'] },
  { category: '교통·기타', items: ['주차 수용 대수', '대중교통 접근성', '셔틀버스 유무', 'ATM기 유무', '화환 반입 가능 여부'] },
];

/* ─── 기본 체크리스트 ─────────────────────────────────────────── */
/* ─── 카테고리 매핑 ───────────────────────────────────────────────
 * 33개 항목을 7개 영역으로 분류 → 진행률 가로 스크롤 + 영역 필터.
 * 사용자 추가 custom 항목은 자동으로 '기타' 부여.
 * (DB 컬럼 없이 title 기반 매핑 — 향후 DB column 추가 가능) */
const CATEGORIES = ['식장', '스드메', '청첩장·하객', '신혼여행', '신혼집·예물', '예식 디테일', '기타'];

const CATEGORY_PALETTE = {
  '식장':        { bg: 'var(--champagne-wash)', fg: 'var(--champagne-2)' },
  '스드메':      { bg: '#FCE4DD', fg: '#B85B41' },
  '청첩장·하객': { bg: '#E0EAF6', fg: '#3766A8' },
  '신혼여행':    { bg: '#DEEFE0', fg: '#3F8A55' },
  '신혼집·예물': { bg: '#F4ECDA', fg: '#A37D2C' },
  '예식 디테일': { bg: '#EFE3F0', fg: '#7A4582' },
  '기타':        { bg: 'var(--rule)', fg: 'var(--ink-3)' },
};

const CATEGORY_BY_TITLE = {
  '결혼 날짜 및 웨딩홀 확정': '식장',
  '웨딩홀 투어 및 계약': '식장',
  '웨딩홀 잔금 납부': '식장',

  '스드메(스튜디오·드레스·메이크업) 업체 투어': '스드메',
  '스튜디오 촬영 예약': '스드메',
  '드레스·예복 계약': '스드메',
  '웨딩 메이크업·헤어 계약': '스드메',
  '드레스 최종 피팅': '스드메',

  '청첩장 문구 작성 및 인쇄': '청첩장·하객',
  '하객 명단 정리': '청첩장·하객',
  '청첩장 발송': '청첩장·하객',
  '하객 참석 여부 최종 확인': '청첩장·하객',

  '신혼여행 목적지 결정': '신혼여행',
  '신혼여행 항공·숙소 예약': '신혼여행',
  '신혼여행 여행자보험 가입': '신혼여행',
  '신혼여행 짐 준비': '신혼여행',

  '혼수 목록 작성': '신혼집·예물',
  '신혼집 탐색 시작': '신혼집·예물',
  '혼수 구매 시작': '신혼집·예물',
  '신혼집 계약 및 이사 준비': '신혼집·예물',
  '예물(반지) 구매': '신혼집·예물',
  '함 내용 준비': '신혼집·예물',

  '주례·사회자 섭외': '예식 디테일',
  '폐백 준비': '예식 디테일',
  '꽃 장식 및 포토테이블 확정': '예식 디테일',
  '부케·부토니어 예약': '예식 디테일',
  '식순 최종 점검': '예식 디테일',
  '부모님·주례님 감사 인사 준비': '예식 디테일',
  '당일 타임라인 최종 확인': '예식 디테일',

  '총 예산 협의': '기타',
  '혼인신고서 준비': '기타',
  '신부 피부·네일 케어': '기타',
  '혼인신고서 제출': '기타',
};

function getItemCategory(item) {
  return CATEGORY_BY_TITLE[item.title] || '기타';
}

/* ─── 항목 가이드 (핵심 10개) ─────────────────────────────────── */
const ITEM_GUIDES = {
  '결혼 날짜 및 웨딩홀 확정': '가장 먼저. 양가 형편 협의 + 웨딩홀 가능 일자 교차 확인. 일자가 정해져야 모든 일정이 시작돼요.',
  '스드메(스튜디오·드레스·메이크업) 업체 투어': '본식 결과물 절반을 좌우. 인스타·블로그로 후보 3-5곳 추린 뒤 직접 투어. 패키지 vs 개별 결정.',
  '스튜디오 촬영 예약': '예약 6개월 전 권장. 인기 스튜디오는 더 일찍 마감. 컨셉(프렌치·내추럴·키치 등) 미리 정해두면 미팅 효율적.',
  '드레스·예복 계약': '드레스는 시즌 따라 1-3벌 대여. 가봉 일정 확보 필수. 예복은 본식·예복·턱시도 구분 확인.',
  '청첩장 문구 작성 및 인쇄': '발송 4주 전엔 인쇄 완료. 양가 부모 성함·식장 주소·약도·교통편을 정확히. 모바일 청첩장과 함께 디자인.',
  '하객 명단 정리': '식대 견적 + 답례품 수량 산정의 기준. 신랑·신부 측 분리해서 엑셀로 관리. 식사 여부 표시.',
  '청첩장 발송': '본식 4-6주 전 발송. 우편 + 모바일 동시. 직장 동료는 상사·동료 구분해서 빠짐없이.',
  '신혼여행 목적지 결정': '비자·항공권 가격·시즌 고려. 6-8개월 전 결정해야 항공권 좋은 가격에 잡힘.',
  '신혼여행 항공·숙소 예약': '항공권 일찍 잡을수록 가격 유리. 패키지 vs 자유여행 결정. 신혼여행 보험 별도 가입.',
  '하객 참석 여부 최종 확인': 'RSVP로 D-2~3주에 최종 확정. 식사 인원 식장에 통보 → 잔금 산정 정확.',
  '식순 최종 점검': '입장·축가·축사·서약·이벤트 시간 분배. 식장 측과 1주일 전 리허설.',
  '웨딩홀 잔금 납부': 'D-7~14일 전 잔금. 식대(인원수×단가) 정확히 확정 후 입금. 영수증 보관.',
  '드레스 최종 피팅': 'D-7~14일 마지막 가봉. 체형 변화 점검. 본식 액세서리·이너 함께 착용해서 시뮬레이션.',
  '혼인신고서 제출': '결혼식 전후 자유. 시청·구청 직접 방문 또는 정부24. 신분증·증인 2명 서명 필요.',
};
function getItemGuide(item) {
  return ITEM_GUIDES[item.title] || null;
}

const DEFAULT_CHECKLIST = [
  { title: '결혼 날짜 및 웨딩홀 확정',                  due_months_before: 12, assigned_to: 'both'  },
  { title: '총 예산 협의',                               due_months_before: 12, assigned_to: 'both'  },
  { title: '스드메(스튜디오·드레스·메이크업) 업체 투어', due_months_before: 12, assigned_to: 'bride' },
  { title: '웨딩홀 투어 및 계약',                        due_months_before: 12, assigned_to: 'both'  },
  { title: '스튜디오 촬영 예약',                         due_months_before: 10, assigned_to: 'bride' },
  { title: '드레스·예복 계약',                           due_months_before: 10, assigned_to: 'both'  },
  { title: '웨딩 메이크업·헤어 계약',                    due_months_before: 10, assigned_to: 'bride' },
  { title: '신혼여행 목적지 결정',                       due_months_before: 10, assigned_to: 'both'  },
  { title: '신혼여행 항공·숙소 예약',                    due_months_before: 8,  assigned_to: 'both'  },
  { title: '혼수 목록 작성',                             due_months_before: 8,  assigned_to: 'both'  },
  { title: '신혼집 탐색 시작',                           due_months_before: 8,  assigned_to: 'both'  },
  { title: '청첩장 문구 작성 및 인쇄',                   due_months_before: 6,  assigned_to: 'both'  },
  { title: '하객 명단 정리',                             due_months_before: 6,  assigned_to: 'both'  },
  { title: '주례·사회자 섭외',                           due_months_before: 6,  assigned_to: 'groom' },
  { title: '폐백 준비',                                  due_months_before: 6,  assigned_to: 'bride' },
  { title: '청첩장 발송',                                due_months_before: 4,  assigned_to: 'both'  },
  { title: '혼수 구매 시작',                             due_months_before: 4,  assigned_to: 'both'  },
  { title: '신혼집 계약 및 이사 준비',                   due_months_before: 4,  assigned_to: 'both'  },
  { title: '예물(반지) 구매',                            due_months_before: 3,  assigned_to: 'both'  },
  { title: '함 내용 준비',                               due_months_before: 3,  assigned_to: 'groom' },
  { title: '꽃 장식 및 포토테이블 확정',                 due_months_before: 3,  assigned_to: 'both'  },
  { title: '드레스 최종 피팅',                           due_months_before: 2,  assigned_to: 'bride' },
  { title: '부케·부토니어 예약',                         due_months_before: 2,  assigned_to: 'bride' },
  { title: '신혼여행 여행자보험 가입',                   due_months_before: 2,  assigned_to: 'both'  },
  { title: '하객 참석 여부 최종 확인',                   due_months_before: 1,  assigned_to: 'both'  },
  { title: '식순 최종 점검',                             due_months_before: 1,  assigned_to: 'both'  },
  { title: '웨딩홀 잔금 납부',                           due_months_before: 1,  assigned_to: 'both'  },
  { title: '혼인신고서 준비',                            due_months_before: 0.5,  assigned_to: 'both'  },
  { title: '신부 피부·네일 케어',                        due_months_before: 0.5,  assigned_to: 'bride' },
  { title: '신혼여행 짐 준비',                           due_months_before: 0.5,  assigned_to: 'both'  },
  { title: '혼인신고서 제출',                            due_months_before: 0.25, assigned_to: 'both'  },
  { title: '당일 타임라인 최종 확인',                    due_months_before: 0.25, assigned_to: 'both'  },
  { title: '부모님·주례님 감사 인사 준비',               due_months_before: 0.25, assigned_to: 'both'  },
];

/* ─── 메인 컴포넌트 ──────────────────────────────────────────── */
export default function TimelinePage() {
  const router  = useRouter();
  const todayDt = new Date();

  const [loading,      setLoading]      = useState(true);
  const [items,        setItems]        = useState([]);
  const [coupleId,     setCoupleId]     = useState(null);
  const [weddingDate,  setWeddingDate]  = useState(null);
  const [vendors,      setVendors]      = useState([]);

  const [viewMode,     setViewMode]     = useState('list');
  const [activeTab,    setActiveTab]    = useState('current');

  // 항목 추가 상태
  const [adding,       setAdding]       = useState(false);
  const [newTitle,     setNewTitle]     = useState('');
  const [newAssigned,  setNewAssigned]  = useState('both');
  const [newMode,      setNewMode]      = useState('period'); // 'period'|'date'|'undated'
  const [newMonths,    setNewMonths]    = useState(1);
  const [newDueDate,   setNewDueDate]   = useState('');
  const [newMemo,      setNewMemo]      = useState('');
  const [saving,       setSaving]       = useState(false);

  // 항목 수정 상태
  const [menuId,       setMenuId]       = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [editTitle,    setEditTitle]    = useState('');
  const [editAssigned, setEditAssigned] = useState('both');
  const [editMode,     setEditMode]     = useState('period');
  const [editMonths,   setEditMonths]   = useState(1);
  const [editDueDate,  setEditDueDate]  = useState('');
  const [editMemo,     setEditMemo]     = useState('');

  const [expandedMemo, setExpandedMemo] = useState(null);
  const [showVenueTour,setShowVenueTour]= useState(false);
  const [venueChecked, setVenueChecked] = useState({});
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateDone,    setTemplateDone]    = useState(false);

  // 캘린더
  const [calYear,     setCalYear]     = useState(todayDt.getFullYear());
  const [calMonth,    setCalMonth]    = useState(todayDt.getMonth());
  // 첫 진입 시 오늘 자동 선택 → 사용자가 바로 "오늘 뭐 있는지" 확인 가능
  const [calSelected, setCalSelected] = useState(todayDt.getDate());

  const { coupleId: cId, userData, loading: authLoading } = useCouple('couple_id, role');
  const userRole = userData?.role || null; // 'groom' | 'bride' | null
  const [myOnly, setMyOnly] = useState(false); // "내 할 일만" 토글

  /* ─ 데이터 로드 ─ */
  useEffect(() => {
    if (authLoading) return;
    if (!cId) { router.push('/setup'); return; }
    setCoupleId(cId);

    const load = async () => {
      const [coupleRes, itemsRes, vendorRes] = await Promise.all([
        supabase.from('couples').select('wedding_date, venue_tour_checked').eq('id', cId).single(),
        // select('*') 제거 → 실제 사용 컬럼만
        supabase.from('checklist_items')
          .select('id, title, is_done, due_months_before, due_date, assigned_to, memo, couple_id')
          .eq('couple_id', cId)
          .order('due_months_before', { ascending: false }),
        supabase.from('vendors').select('id,name,type,balance_due,contract_status').eq('couple_id', cId),
      ]);
      setWeddingDate(coupleRes.data?.wedding_date || null);
      setVenueChecked(coupleRes.data?.venue_tour_checked || {});
      setItems(itemsRes.data || []);
      setVendors(vendorRes.data || []);
      setLoading(false);
    };
    load();
  }, [authLoading, cId, router]);

  /* ─ 웨딩홀 투어 체크 Supabase 저장 ─ */
  async function saveVenueChecked(next) {
    if (!coupleId) return;
    await supabase.from('couples').update({ venue_tour_checked: next }).eq('id', coupleId);
  }

  /* ─ Realtime ─ */
  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`timeline-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items', filter: `couple_id=eq.${coupleId}` }, (p) => {
        if (p.eventType === 'INSERT') setItems(prev => prev.find(i => i.id === p.new.id) ? prev : [...prev, p.new]);
        if (p.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === p.new.id ? p.new : i));
        if (p.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId]);

  /* ─ 액션 ─ */
  async function toggleItem(id, current) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, is_done: !current } : it));
    await supabase.from('checklist_items').update({ is_done: !current }).eq('id', id);
  }

  async function addItem() {
    if (!newTitle.trim() || !coupleId) return;
    setSaving(true);

    // 기간 탭에서 추가할 때 해당 탭의 기간 사용
    let months = newMonths;
    if (newMode === 'period' && typeof activeTab === 'number') months = activeTab;

    const payload = {
      couple_id: coupleId,
      title: newTitle.trim(),
      assigned_to: newAssigned,
      is_done: false,
      memo: newMemo.trim() || null,
      due_months_before: newMode === 'period'   ? months   : null,
      due_date:          newMode === 'date'      ? newDueDate || null : null,
    };

    const { data, error } = await supabase.from('checklist_items').insert(payload).select().single();
    if (!error && data) setItems(prev => [...prev, data]);
    setNewTitle(''); setNewAssigned('both'); setNewMemo('');
    setNewMode('period'); setNewDueDate('');
    setAdding(false); setSaving(false);
  }

  async function loadTemplate() {
    if (!coupleId || loadingTemplate) return;
    setLoadingTemplate(true);
    const rows = DEFAULT_CHECKLIST.map(t => ({
      couple_id: coupleId, title: t.title,
      due_months_before: t.due_months_before, assigned_to: t.assigned_to, is_done: false,
    }));
    const { data, error } = await supabase.from('checklist_items').insert(rows).select();
    if (!error && data) {
      setItems(prev => [...prev, ...data]);
      setTemplateDone(true);
      setActiveTab('all');
    }
    setLoadingTemplate(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAssigned(item.assigned_to);
    setEditMemo(item.memo || '');
    if (item.due_date) {
      setEditMode('date');
      setEditDueDate(item.due_date.slice(0, 10));
    } else if (item.due_months_before !== null && item.due_months_before !== undefined) {
      setEditMode('period');
      setEditMonths(item.due_months_before);
    } else {
      setEditMode('undated');
    }
    setMenuId(null);
  }

  async function saveEdit(id) {
    if (!editTitle.trim()) return;
    const updates = {
      title: editTitle.trim(),
      assigned_to: editAssigned,
      memo: editMemo.trim() || null,
      due_months_before: editMode === 'period' ? editMonths  : null,
      due_date:          editMode === 'date'   ? editDueDate || null : null,
    };
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    await supabase.from('checklist_items').update(updates).eq('id', id);
    setEditingId(null);
  }

  async function deleteItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    await supabase.from('checklist_items').delete().eq('id', id);
    setMenuId(null);
  }

  /* ─ 오늘의 추천 (미완료 + 마감 가까운 3개) ─ */
  const todaysFocus = useMemo(() => {
    const candidates = items
      .filter(i => !i.is_done)
      .map(i => ({ item: i, d: getItemDate(i, weddingDate) }))
      .filter(x => x.d) // 마감일 환산 가능한 것만
      .sort((a, b) => a.d - b.d);
    return candidates.slice(0, 3);
  }, [items, weddingDate]);

  /* ─ D-day & 진행률 통계 (헤더 인사이트 카드용) ─ */
  const dDay = useMemo(() => {
    if (!weddingDate) return null;
    const t = new Date(); t.setHours(0,0,0,0);
    const w = new Date(weddingDate); w.setHours(0,0,0,0);
    return Math.round((w - t) / 86400000);
  }, [weddingDate]);

  const stats = useMemo(() => {
    const total = items.length;
    const done  = items.filter(i => i.is_done).length;
    const pct   = total > 0 ? Math.round(done / total * 100) : 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const weekLater = new Date(today); weekLater.setDate(today.getDate() + 7);
    let overdue = 0, thisWeek = 0;
    items.forEach(i => {
      if (i.is_done) return;
      const d = getItemDate(i, weddingDate);
      if (!d) return;
      if (d < today) overdue++;
      else if (d <= weekLater) thisWeek++;
    });
    return { total, done, pct, overdue, thisWeek };
  }, [items, weddingDate]);

  /* ─ 카테고리별 진행률 (useMemo) ─ */
  const categoryStats = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(c => { map[c] = { total: 0, done: 0 }; });
    items.forEach(i => {
      const c = getItemCategory(i);
      if (!map[c]) map[c] = { total: 0, done: 0 };
      map[c].total++;
      if (i.is_done) map[c].done++;
    });
    return CATEGORIES
      .map(c => ({ name: c, ...map[c], pct: map[c].total > 0 ? Math.round(map[c].done / map[c].total * 100) : 0 }))
      .filter(x => x.total > 0); // 빈 카테고리는 표시 안 함
  }, [items]);

  // 카테고리 필터 (null이면 전체)
  const [categoryFilter, setCategoryFilter] = useState(null);

  /* ─ 필터 (useMemo — items/activeTab/weddingDate/myOnly/categoryFilter 바뀔 때만 재계산) ─ */
  const displayed = useMemo(() => {
    // 1) 담당 필터 ("내 할 일만")
    let list = items;
    if (myOnly && userRole) {
      list = list.filter(i => i.assigned_to === userRole || i.assigned_to === 'both');
    }

    // 2) 카테고리 필터
    if (categoryFilter) {
      list = list.filter(i => getItemCategory(i) === categoryFilter);
    }

    // 3) 탭 필터
    if (activeTab === 'all') return list;

    // 'current' = "다가오는" — 미완료 항목 중 마감 4주 이내 OR 지난 마감
    // 자동 정렬: 지난 마감 → 가까운 마감 → 멀리 있는 → 미정
    if (activeTab === 'current') {
      const today = new Date(); today.setHours(0,0,0,0);
      const fourWeeksLater = new Date(today); fourWeeksLater.setDate(today.getDate() + 28);
      return list
        .filter(item => {
          if (item.is_done) return false;
          const d = getItemDate(item, weddingDate);
          if (!d) return true;
          return d <= fourWeeksLater;
        })
        .sort((a, b) => {
          const da = getItemDate(a, weddingDate);
          const db = getItemDate(b, weddingDate);
          // 미정은 뒤로
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          // 가까운 마감(과거 포함) 순
          return da - db;
        });
    }

    // 특정 기간만
    return list.filter(i => i.due_months_before === activeTab);
  }, [items, activeTab, weddingDate, myOnly, userRole, categoryFilter]);

  const doneCount = useMemo(() => displayed.filter(i => i.is_done).length, [displayed]);

  // 날짜 미리보기 (추가 폼)
  function getPreviewDate(mode, months, dueDate, wDate) {
    if (mode === 'date' && dueDate) return fmtDate(dueDate);
    if (mode === 'period' && wDate) {
      const period = MONTHS_TO_PERIOD[months];
      const d = getPeriodDate(wDate, period);
      if (d) return fmtDate(d);
    }
    return null;
  }

  /* ─ 아이템 렌더 ─ */
  function renderItem(item, isLast = false) {
    const tag        = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
    const isEditing  = editingId === item.id;
    const isMenuOpen = menuId === item.id;
    const memoExpanded = expandedMemo === item.id;
    const dueLabel   = getItemDueLabel(item, weddingDate);
    // 마감 긴급도 ('overdue': 지난 미완료, 'soon': 이번 주 마감) — 미완료만 평가
    let urgency = null;
    if (!item.is_done) {
      const d = getItemDate(item, weddingDate);
      if (d) {
        const today0 = new Date(); today0.setHours(0,0,0,0);
        const weekL  = new Date(today0); weekL.setDate(today0.getDate() + 7);
        if (d < today0) urgency = 'overdue';
        else if (d <= weekL) urgency = 'soon';
      }
    }

    if (isEditing) {
      const editPreview = getPreviewDate(editMode, editMonths, editDueDate, weddingDate);
      return (
        <div key={item.id} className="py-3 flex flex-col gap-2"
          style={{ borderBottom: isLast ? 'none' : '1px solid var(--beige)' }}>
          <input className="input-field text-sm" value={editTitle}
            onChange={e => setEditTitle(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)} />

          {/* 담당 */}
          <div className="flex gap-2">
            {ASSIGNED_OPTIONS.map(a => (
              <button key={a} onClick={() => setEditAssigned(a)}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: editAssigned === a ? 'var(--rose)' : 'white', color: editAssigned === a ? 'white' : 'var(--stone)', border: `1.5px solid ${editAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}` }}>
                {ASSIGNED_LABELS[a].label}
              </button>
            ))}
          </div>

          {/* 시기 모드 */}
          <DueModeSelector mode={editMode} onChange={setEditMode} />
          {editMode === 'period' && (
            <div>
              <select className="input-field text-sm" value={editMonths} onChange={e => setEditMonths(Number(e.target.value))}>
                {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {editPreview && <p className="text-xs mt-1" style={{ color: 'var(--toss-blue)' }}>= {editPreview}</p>}
            </div>
          )}
          {editMode === 'date' && (
            <div>
              <input type="date" className="input-field text-sm" value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)} />
            </div>
          )}
          {editMode === 'undated' && (
            <p className="text-xs" style={{ color: 'var(--stone)' }}>나중에 시기를 설정할 수 있어요</p>
          )}

          {/* 메모 */}
          <textarea className="input-field text-sm resize-none" rows={2}
            placeholder="메모 (업체명, 계약금, 연락처 등)" value={editMemo}
            onChange={e => setEditMemo(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-outline flex-1 text-sm py-2" onClick={() => setEditingId(null)}>취소</button>
            <button className="btn-rose flex-1 text-sm py-2" onClick={() => saveEdit(item.id)}>저장</button>
          </div>
        </div>
      );
    }

    return (
      <li key={item.id} className="py-3 relative"
        style={{ borderBottom: isLast ? 'none' : '1px solid var(--beige)' }}>
        <div className="flex items-start gap-3">
          <button onClick={() => toggleItem(item.id, item.is_done)}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all mt-0.5"
            style={{ border: `2px solid ${item.is_done ? 'var(--rose)' : 'var(--stone-light)'}`, backgroundColor: item.is_done ? 'var(--rose)' : 'transparent' }}>
            {item.is_done && <Icon name="check" size={10} color="white" />}
          </button>

          <div className="flex-1 min-w-0">
            <span className="text-sm" style={{ color: item.is_done ? 'var(--stone)' : 'var(--ink)', textDecoration: item.is_done ? 'line-through' : 'none' }}>
              {item.title}
            </span>
            {/* 날짜 표시 + 마감 긴급도 배지 */}
            {(dueLabel || urgency) && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {urgency === 'overdue' && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, backgroundColor: 'var(--toss-red-light, #FFE9E9)', color: 'var(--toss-red, #E74C3C)' }}>
                    ⚠ 지난 마감
                  </span>
                )}
                {urgency === 'soon' && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, backgroundColor: 'var(--champagne-wash)', color: 'var(--champagne-2)' }}>
                    이번 주
                  </span>
                )}
                {dueLabel && (
                  <span className="text-xs" style={{ color: item.due_date ? 'var(--toss-blue)' : 'var(--stone)' }}>
                    {dueLabel}
                  </span>
                )}
              </div>
            )}
            {item.memo && !memoExpanded && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--stone)' }}>{item.memo}</p>
            )}
          </div>

          <span className={`tag ${tag.cls} flex-shrink-0`}>{tag.label}</span>

          <button onClick={() => setExpandedMemo(memoExpanded ? null : item.id)}
            style={{ color: item.memo ? 'var(--rose)' : 'var(--stone-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>
            <FileText size={15} strokeWidth={2} />
          </button>

          <button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : item.id); }}
            className="text-lg flex-shrink-0"
            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
            ···
          </button>
        </div>

        {memoExpanded && (
          <>
            {/* 항목 가이드 (있을 때만) — 펼침 시 사용자 메모 위에 표시 */}
            {getItemGuide(item) && (
              <div style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: 'var(--champagne-wash)',
                borderLeft: '3px solid var(--champagne)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--champagne-2)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                  💡 가이드
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '4px 0 0' }}>
                  {getItemGuide(item)}
                </p>
              </div>
            )}
            <MemoEditor item={item} onSave={async text => {
              const memo = text.trim() || null;
              setItems(prev => prev.map(it => it.id === item.id ? { ...it, memo } : it));
              setExpandedMemo(null);
              await supabase.from('checklist_items').update({ memo }).eq('id', item.id);
            }} onClose={() => setExpandedMemo(null)} />
          </>
        )}

        {isMenuOpen && (
          <div className="absolute right-0 z-10 rounded-xl shadow-lg overflow-hidden"
            style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: 110 }}
            onClick={e => e.stopPropagation()}>
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
              style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => startEdit(item)}>
              <Edit3 size={14} /> 수정
            </button>
            <div style={{ height: 1, backgroundColor: 'var(--beige)' }} />
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
              style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => deleteItem(item.id)}>
              <Trash2 size={14} /> 삭제
            </button>
          </div>
        )}
      </li>
    );
  }

  /* ─ 캘린더 ─ */
  function prevCalMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setCalSelected(null);
  }
  function nextCalMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setCalSelected(null);
  }

  const calEvents           = buildCalEvents(calYear, calMonth, weddingDate, items, vendors);
  const firstDay            = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth         = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells            = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  const calSelectedDate     = calSelected ? new Date(calYear, calMonth, calSelected) : null;
  const calSelectedEvents   = calSelectedDate ? calEvents.filter(e => isSameDay(e.date, calSelectedDate)) : [];

  if (loading) return <PageLoader />;

  const venueTotal        = VENUE_CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const venueCheckedCount = Object.values(venueChecked).filter(Boolean).length;
  const activePeriodLabel = TIME_PERIODS.find(p => p.value === activeTab)?.label;
  const addPreview        = getPreviewDate(newMode, newMonths, newDueDate, weddingDate);

  // 전체 보기용 그룹 분류
  const periodItems  = items.filter(i => i.due_months_before !== null && i.due_months_before !== undefined && !i.due_date);
  const dateItems    = items.filter(i => i.due_date);
  const undatedItems = items.filter(i => i.due_months_before === null || i.due_months_before === undefined).filter(i => !i.due_date);

  return (
    <div className="page-wrapper" onClick={() => setMenuId(null)}>
      {/* 헤더 + 뷰 토글 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            체크리스트
          </h1>
          <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 13, fontWeight: 500, color: 'var(--champagne-2)', letterSpacing: '0.04em', margin: '4px 0 0' }}>
            · 24주 준비 타임라인 ·
          </p>
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--rule-strong)', borderRadius: 20, overflow: 'hidden', backgroundColor: 'var(--paper-pure)' }}>
          <button onClick={() => setViewMode('list')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: viewMode === 'list' ? 'var(--ivory)' : 'var(--ink-3)', backgroundColor: viewMode === 'list' ? 'var(--ink)' : 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', borderRight: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
            <List size={12} strokeWidth={1.5} /> list
          </button>
          <button onClick={() => setViewMode('calendar')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: viewMode === 'calendar' ? 'var(--ivory)' : 'var(--ink-3)', backgroundColor: viewMode === 'calendar' ? 'var(--ink)' : 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            <CalendarDays size={12} strokeWidth={1.5} /> cal
          </button>
        </div>
      </div>

      {/* ── 인사이트 헤더 카드 (D-day · 진행률 · 임박/지난) ── */}
      <div className="card mb-4" style={{ padding: '18px 20px' }}>
        {weddingDate ? (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic' }}>
                  · until our day ·
                </p>
                <p style={{ fontFamily: 'var(--font-serif-en)', fontSize: 36, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.05, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                  {dDay >= 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `D+${Math.abs(dDay)}`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{stats.done}</span>
                  <span style={{ color: 'var(--ink-4)' }}> / {stats.total}</span> 완료
                </p>
                <p style={{ fontFamily: 'var(--font-serif-en)', fontSize: 24, fontWeight: 700, color: 'var(--champagne-2)', lineHeight: 1, margin: '4px 0 0' }} className="tabular-nums">
                  {stats.pct}%
                </p>
              </div>
            </div>
            {/* progress bar */}
            <div style={{ height: 6, backgroundColor: 'var(--rule)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.pct}%`, backgroundColor: 'var(--champagne)', transition: 'width 0.4s ease' }} />
            </div>
            {/* 배지: 이번 주 마감 / 지난 마감 */}
            {(stats.thisWeek > 0 || stats.overdue > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {stats.overdue > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--toss-red-light, #FFE9E9)', color: 'var(--toss-red, #E74C3C)' }}>
                    ⚠ 지난 마감 {stats.overdue}개
                  </span>
                )}
                {stats.thisWeek > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--champagne-wash)', color: 'var(--champagne-2)' }}>
                    이번 주 마감 {stats.thisWeek}개
                  </span>
                )}
              </div>
            )}

            {/* 🎯 지금 가장 임박한 일 — 마감 가까운 미완료 3개 */}
            {todaysFocus.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--rule)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  🎯 지금 가장 임박한 일
                </p>
                <div className="flex flex-col gap-1.5">
                  {todaysFocus.map(({ item, d }) => {
                    const today0 = new Date(); today0.setHours(0,0,0,0);
                    const diffDays = Math.round((d - today0) / 86400000);
                    const dLabel = diffDays < 0 ? `D+${Math.abs(diffDays)}` : diffDays === 0 ? 'D-day' : `D-${diffDays}`;
                    const colorBg = diffDays < 0 ? 'var(--toss-red-light, #FFE9E9)' : diffDays <= 7 ? 'var(--champagne-wash)' : 'var(--paper)';
                    const colorFg = diffDays < 0 ? 'var(--toss-red, #E74C3C)' : diffDays <= 7 ? 'var(--champagne-2)' : 'var(--ink-3)';
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab('current'); setCategoryFilter(null); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          backgroundColor: 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--paper)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="tabular-nums" style={{
                          flexShrink: 0,
                          fontSize: 11, fontWeight: 700,
                          padding: '3px 8px', borderRadius: 999,
                          backgroundColor: colorBg, color: colorFg,
                          minWidth: 50, textAlign: 'center',
                        }}>
                          {dLabel}
                        </span>
                        <span style={{ fontSize: 13.5, color: 'var(--ink-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>결혼 날짜를 정해보세요</p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 12px' }}>D-day · 진행률 · 마감 알림이 작동해요</p>
            <button
              onClick={() => router.push('/setup')}
              style={{
                backgroundColor: 'var(--ink)', color: 'var(--ivory)',
                border: 'none', borderRadius: 999,
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              결혼 날짜 설정하기
            </button>
          </div>
        )}
      </div>

      {/* ── 카테고리 진행률 (가로 스크롤) ── */}
      {items.length > 0 && categoryStats.length > 0 && (
        <div className="mb-4">
          <p className="t-kicker" style={{ marginBottom: 8 }}>· 카테고리별 진행률 ·</p>
          <div
            style={{
              display: 'flex', gap: 8, overflowX: 'auto',
              scrollbarWidth: 'none', msOverflowStyle: 'none',
              paddingBottom: 4,
              marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4,
            }}
          >
            {/* 전체 토글 카드 */}
            <button
              onClick={() => setCategoryFilter(null)}
              style={{
                flexShrink: 0, minWidth: 96, padding: '12px 14px',
                borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                backgroundColor: categoryFilter === null ? 'var(--ink)' : 'var(--paper)',
                color: categoryFilter === null ? 'var(--ivory)' : 'var(--ink)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>전체</p>
              <p className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, margin: '2px 0 0' }}>
                {stats.done}/{stats.total}
              </p>
            </button>
            {categoryStats.map(cat => {
              const isActive = categoryFilter === cat.name;
              const palette  = CATEGORY_PALETTE[cat.name] || CATEGORY_PALETTE['기타'];
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategoryFilter(isActive ? null : cat.name)}
                  style={{
                    flexShrink: 0, minWidth: 110, padding: '12px 14px',
                    borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                    backgroundColor: isActive ? palette.fg : palette.bg,
                    color: isActive ? '#fff' : palette.fg,
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{cat.name}</p>
                  <p className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 0' }}>
                    {cat.done}/{cat.total}
                    <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6 }}>{cat.pct}%</span>
                  </p>
                  <div style={{ height: 3, backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${cat.pct}%`, backgroundColor: isActive ? '#fff' : palette.fg, transition: 'width 0.3s' }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ 리스트 뷰 ══ */}
      {viewMode === 'list' && (
        <>
          {/* 웨딩홀 투어 — 타임라인과 별개의 참고 도구 */}
          <div className="t-kicker" style={{ marginTop: 4, marginBottom: 8 }}>· 참고 도구 ·</div>
          <div className="card mb-6" style={{ border: `1.5px solid ${showVenueTour ? 'var(--rose)' : 'var(--stone-light)'}` }}>
            <button className="w-full flex items-center justify-between"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setShowVenueTour(!showVenueTour)}>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: 'var(--rose)' }}>웨딩홀 투어 체크리스트</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                  {venueCheckedCount > 0 ? `${venueCheckedCount}/${venueTotal} 확인` : `투어 시 확인할 ${venueTotal}가지 항목`}
                </p>
              </div>
              <span style={{ color: 'var(--stone)' }}>{showVenueTour ? '▲' : '▼'}</span>
            </button>
            {showVenueTour && (
              <div className="mt-4" onClick={e => e.stopPropagation()}>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--stone)' }}>
                    <span>진행률</span><span>{venueCheckedCount}/{venueTotal}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${venueTotal > 0 ? Math.round(venueCheckedCount / venueTotal * 100) : 0}%` }} />
                  </div>
                </div>
                {VENUE_CHECKLIST.map(section => (
                  <div key={section.category} className="mb-3">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{section.category}</p>
                    {section.items.map(it => {
                      const key = `${section.category}-${it}`;
                      const checked = !!venueChecked[key];
                      return (
                        <div key={it} className="flex items-start gap-2 py-1 cursor-pointer"
                          onClick={() => setVenueChecked(p => {
                            const next = { ...p, [key]: !p[key] };
                            saveVenueChecked(next);
                            return next;
                          })}>
                          <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center mt-0.5 transition-all"
                            style={{ border: `2px solid ${checked ? 'var(--rose)' : 'var(--stone-light)'}`, backgroundColor: checked ? 'var(--rose)' : 'white' }}>
                            {checked && <Icon name="check" size={9} color="white" />}
                          </div>
                          <span className="text-xs flex-1" style={{ color: checked ? 'var(--stone)' : 'var(--ink)', textDecoration: checked ? 'line-through' : 'none' }}>
                            {it}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <button className="text-xs mt-1" style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setVenueChecked({}); saveVenueChecked({}); }}>초기화</button>
              </div>
            )}
          </div>

          {/* 탭 필터 */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setActiveTab('current')}
              style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: activeTab === 'current' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'current' ? 'var(--ivory)' : 'var(--ink-3)', border: `1px solid ${activeTab === 'current' ? 'var(--ink)' : 'var(--rule)'}` }}>
              다가오는
            </button>
            <select
              value={typeof activeTab === 'number' ? activeTab : ''}
              onChange={e => e.target.value !== '' && setActiveTab(Number(e.target.value))}
              style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 20, fontSize: 13, fontFamily: 'var(--font-sans)', border: `1px solid ${typeof activeTab === 'number' ? 'var(--ink)' : 'var(--rule)'}`, backgroundColor: typeof activeTab === 'number' ? 'var(--ink)' : 'var(--paper)', color: typeof activeTab === 'number' ? 'var(--ivory)' : 'var(--ink-3)', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A79D90' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32, cursor: 'pointer' }}>
              <option value="">{activePeriodLabel ?? '기간 선택'}</option>
              {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button onClick={() => setActiveTab('all')}
              style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: activeTab === 'all' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'all' ? 'var(--ivory)' : 'var(--ink-3)', border: `1px solid ${activeTab === 'all' ? 'var(--ink)' : 'var(--rule)'}` }}>
              전체
            </button>
          </div>

          {/* "내 할 일만" 필터 — 사용자에게 role 있을 때만 노출 */}
          {userRole && (
            <div className="flex items-center mb-4">
              <button
                onClick={() => setMyOnly(v => !v)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 999,
                  backgroundColor: myOnly ? 'var(--champagne-wash)' : 'transparent',
                  color: myOnly ? 'var(--champagne-2)' : 'var(--ink-3)',
                  border: `1px solid ${myOnly ? 'var(--champagne)' : 'var(--rule)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {myOnly ? '✓ ' : ''}내 할 일만 ({userRole === 'groom' ? '신랑' : '신부'})
              </button>
            </div>
          )}

          {/* 항목 0개 → 어떤 탭이든 템플릿 로드 우선 제안 (첫 진입 막힘 방지) */}
          {items.length === 0 ? (
            <div className="card text-center mb-4" style={{ padding: '32px 20px' }}>
              <p className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>체크리스트가 비어있어요</p>
              <p className="text-sm mb-5" style={{ color: 'var(--stone)', lineHeight: 1.6 }}>
                많이 쓰는 결혼 준비 항목 {DEFAULT_CHECKLIST.length}개를<br />한 번에 불러올 수 있어요
              </p>
              {templateDone ? (
                <p className="text-sm font-semibold" style={{ color: 'var(--toss-blue)' }}>템플릿이 추가됐어요!</p>
              ) : (
                <button className="btn-rose w-full" onClick={loadTemplate} disabled={loadingTemplate}>
                  {loadingTemplate ? '불러오는 중...' : '기본 체크리스트 불러오기'}
                </button>
              )}
              <p className="text-xs mt-3" style={{ color: 'var(--stone)' }}>불러온 후 항목을 자유롭게 수정·삭제할 수 있어요</p>
              {!weddingDate && (
                <button
                  onClick={() => router.push('/setup')}
                  style={{
                    marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline',
                  }}
                >
                  결혼 날짜 먼저 설정하기 →
                </button>
              )}
            </div>
          ) : activeTab === 'all' ? (
            /* 전체 보기: 기간 + 날짜 + 미정 섹션 */
            <div className="flex flex-col gap-4 mb-4">
              {(
                <>
                  {/* ── 타임라인 레일 (기간 기반) ── */}
                  <div className="timeline-rail">
                    {TIME_PERIODS.map(period => {
                      const pItems = periodItems.filter(i => i.due_months_before === period.value);
                      if (pItems.length === 0) return null;
                      const periodDate = weddingDate ? getPeriodDate(weddingDate, period.label) : null;
                      const doneCnt   = pItems.filter(i => i.is_done).length;
                      const allDone   = doneCnt === pItems.length;
                      return (
                        <div key={period.value} className={`timeline-node${allDone ? ' is-done' : ''}`}>
                          <div className="node-date">
                            {period.label}
                            {periodDate && ` · ${fmtDate(periodDate)}`}
                            <span style={{ float: 'right', fontStyle: 'normal', letterSpacing: 0, color: 'var(--ink-4)' }}>
                              {doneCnt}/{pItems.length}
                            </span>
                          </div>
                          <div className="node-card">
                            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                              {pItems.map((item, idx) => renderItem(item, idx === pItems.length - 1))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 날짜 직접 지정 그룹 */}
                  {dateItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="flex items-center justify-between mb-2" style={{ paddingLeft: 28 }}>
                        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', letterSpacing: '0.06em' }}>날짜 직접 지정</p>
                        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{dateItems.filter(i => i.is_done).length}/{dateItems.length}</p>
                      </div>
                      <div className="card p-0">
                        <ul className="px-4">
                          {[...dateItems].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                            .map((item, idx) => renderItem(item, idx === dateItems.length - 1))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 미정 그룹 */}
                  {undatedItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="flex items-center justify-between mb-2" style={{ paddingLeft: 28 }}>
                        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>미정</p>
                        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{undatedItems.filter(i => i.is_done).length}/{undatedItems.length}</p>
                      </div>
                      <div className="card p-0">
                        <ul className="px-4">{undatedItems.map((item, idx) => renderItem(item, idx === undatedItems.length - 1))}</ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* 이번달 / 기간 탭 */
            <>
              {displayed.length > 0 && (
                <p className="text-xs mb-2" style={{ color: 'var(--stone)' }}>{doneCount}/{displayed.length} 완료</p>
              )}
              <div className="card mb-4 p-0">
                {displayed.length === 0 ? (
                  activeTab === 'current' ? (
                    <EmptyState icon={CheckSquare} title={myOnly ? '내가 맡은 임박 항목이 없어요' : '다가오는 항목이 없어요'} description={myOnly ? '필터를 끄면 다른 항목도 볼 수 있어요' : '잘 진행되고 있어요!'} compact />
                  ) : (
                    <EmptyState icon={CheckSquare} title="해당 기간에 항목이 없어요" compact />
                  )
                ) : (
                  <ul className="px-4">{displayed.map((item, idx) => renderItem(item, idx === displayed.length - 1))}</ul>
                )}
              </div>
            </>
          )}

          {/* 항목 추가 폼 */}
          {adding ? (
            <div className="card flex flex-col gap-3 mb-4">
              <input className="input-field" placeholder="항목 이름 입력" value={newTitle}
                onChange={e => setNewTitle(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && addItem()} />

              {/* 담당 */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>담당</p>
                <div className="flex gap-2">
                  {ASSIGNED_OPTIONS.map(a => (
                    <button key={a} onClick={() => setNewAssigned(a)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ backgroundColor: newAssigned === a ? 'var(--rose)' : 'white', color: newAssigned === a ? 'white' : 'var(--stone)', border: `1.5px solid ${newAssigned === a ? 'var(--rose)' : 'var(--stone-light)'}` }}>
                      {ASSIGNED_LABELS[a].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시기 설정 */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>시기</p>
                <DueModeSelector mode={newMode} onChange={setNewMode} />

                {newMode === 'period' && (
                  <div className="mt-2">
                    <select className="input-field text-sm" value={newMonths} onChange={e => setNewMonths(Number(e.target.value))}>
                      {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    {addPreview && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--toss-blue)' }}>
                        = {addPreview}
                      </p>
                    )}
                    {!weddingDate && (
                      <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>
                        결혼 날짜를 설정하면 실제 날짜가 표시돼요
                      </p>
                    )}
                  </div>
                )}

                {newMode === 'date' && (
                  <div className="mt-2">
                    <input type="date" className="input-field text-sm" value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)} />
                  </div>
                )}

                {newMode === 'undated' && (
                  <p className="text-xs mt-2" style={{ color: 'var(--stone)' }}>
                    시기가 정해지면 나중에 수정할 수 있어요
                  </p>
                )}
              </div>

              {/* 메모 */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--stone)' }}>메모 (업체명, 계약금 등)</p>
                <textarea className="input-field text-sm resize-none" rows={2} placeholder="선택사항"
                  value={newMemo} onChange={e => setNewMemo(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <button className="btn-outline flex-1" onClick={() => { setAdding(false); setNewTitle(''); setNewMemo(''); setNewDueDate(''); }}>취소</button>
                <button className="btn-rose flex-1" onClick={addItem} disabled={saving || !newTitle.trim()}>
                  {saving ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-outline w-full" onClick={() => setAdding(true)}>+ 항목 추가</button>
          )}
        </>
      )}

      {/* ══ 캘린더 뷰 ══ */}
      {viewMode === 'calendar' && (
        <>
          <div className="card mb-4" style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevCalMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <ChevronLeft size={20} color="var(--ink)" />
              </button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-serif-en)', fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {calYear}
                </span>
                <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 13, color: 'var(--champagne-2)', margin: '0 6px' }}>·</span>
                <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-2)' }}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][calMonth]}
                </span>
              </div>
              <button onClick={nextCalMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <ChevronRight size={20} color="var(--ink)" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="text-center py-1"
                  style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10, letterSpacing: '0.04em', color: i === 0 ? 'var(--clay)' : 'var(--ink-4)' }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {calCells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const cellDate  = new Date(calYear, calMonth, day);
                const isToday   = isSameDay(cellDate, todayDt);
                const isSel     = calSelected === day;
                const isWedding = weddingDate && isSameDay(cellDate, new Date(weddingDate));
                const dayEvts   = calEvents.filter(e => isSameDay(e.date, cellDate));
                const col       = idx % 7;
                return (
                  <div key={day} className="flex flex-col items-center py-0.5 cursor-pointer"
                    onClick={() => setCalSelected(isSel ? null : day)}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                      style={{
                        backgroundColor: isSel ? 'var(--ink)' : isWedding ? 'var(--champagne-wash)' : 'transparent',
                        border: isToday && !isSel ? '1.5px solid var(--champagne)' : 'none',
                      }}>
                      <span style={{
                        fontFamily: 'var(--font-serif-en)', fontSize: 13, fontWeight: isSel || isToday ? 600 : 400,
                        color: isSel ? 'var(--ivory)' : isWedding ? 'var(--champagne-2)' : col === 0 ? 'var(--clay)' : 'var(--ink)',
                      }}>
                        {day}
                      </span>
                    </div>
                    {dayEvts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 items-center">
                        {dayEvts.slice(0, 2).map((e, i) => (
                          <div key={i} className="rounded-full" style={{ width: 5, height: 5, backgroundColor: e.color }} />
                        ))}
                        {dayEvts.length > 2 && (
                          <span style={{ fontSize: 8, color: 'var(--ink-4)', lineHeight: 1 }}>+{dayEvts.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex gap-4 mb-4 px-1">
            {[
              { color: 'var(--champagne)',   label: '체크리스트' },
              { color: 'var(--ochre)',       label: '업체 잔금' },
              { color: 'var(--clay)',        label: '결혼식 당일' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 7, height: 7, backgroundColor: color }} />
                <span style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* 선택된 날짜 */}
          {calSelected && (
            <div className="card mb-4">
              <p style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>
                {calMonth + 1}월 {calSelected}일 일정
              </p>
              {calSelectedEvents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--stone)' }}>일정이 없어요</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {calSelectedEvents.map((e, i) => <CalEventItem key={i} event={e} />)}
                </div>
              )}
            </div>
          )}

          {/* 이번달 전체 */}
          <div className="card mb-4">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>
              {calMonth + 1}월 전체 일정
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--stone)' }}>{calEvents.length}개</span>
            </p>
            {calEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--stone)' }}>
                {weddingDate ? '이번 달에 예정된 일정이 없어요' : '결혼 날짜를 설정하면 일정이 표시돼요'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...calEvents].sort((a, b) => a.date - b.date).map((e, i) => <CalEventItem key={i} event={e} showDate />)}
              </div>
            )}
          </div>

          {/* 결혼 날짜 미설정 안내는 페이지 상단 인사이트 카드에서 처리 — 여기 중복 제거 */}
        </>
      )}

      <BottomNav active="timeline" />
    </div>
  );
}

/* ─── 시기 모드 선택 ─────────────────────────────────────────── */
function DueModeSelector({ mode, onChange }) {
  const options = [
    { value: 'period',  Icon: Clock,       label: '기간' },
    { value: 'date',    Icon: Calendar,    label: '날짜 지정' },
    { value: 'undated', Icon: HelpCircle,  label: '미정' },
  ];
  return (
    <div className="flex gap-2">
      {options.map(({ value, Icon, label }) => (
        <button key={value} onClick={() => onChange(value)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            backgroundColor: mode === value ? 'var(--rose-light)' : 'white',
            color: mode === value ? 'var(--rose)' : 'var(--stone)',
            border: `1.5px solid ${mode === value ? 'var(--rose)' : 'var(--stone-light)'}`,
          }}>
          <Icon size={13} strokeWidth={2.5} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── 캘린더 이벤트 아이템 ─────────────────────────────────── */
function CalEventItem({ event, showDate }) {
  return (
    <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ backgroundColor: 'var(--paper)' }}>
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: event.color + '22' }}>
        <event.Icon size={16} color={event.color} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        {showDate && (
          <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 10, color: 'var(--champagne-2)', marginBottom: 2, letterSpacing: '0.04em' }}>
            {event.date.getMonth() + 1}. {event.date.getDate()}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 13, color: 'var(--ink)', margin: 0 }}>{event.title}</p>
        {event.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{event.sub}</p>}
      </div>
      {event.badge && (
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: event.color + '22', color: event.color }}>
          {event.badge}
        </span>
      )}
    </div>
  );
}

/* ─── 메모 에디터 ─────────────────────────────────────────── */
function MemoEditor({ item, onSave, onClose }) {
  const [text, setText] = useState(item.memo || '');
  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea className="input-field text-sm resize-none" rows={3}
        placeholder="업체명, 계약금, 연락처, 메모 등..." value={text}
        onChange={e => setText(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <button className="btn-outline flex-1 text-sm py-2" onClick={onClose}>닫기</button>
        <button className="btn-rose flex-1 text-sm py-2" onClick={() => onSave(text)}>저장</button>
      </div>
    </div>
  );
}
