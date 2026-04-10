'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const WEDDING_TYPES = [
  { value: 'hall',    label: '웨딩홀' },
  { value: 'hotel',   label: '호텔' },
  { value: 'outdoor', label: '야외' },
  { value: 'small',   label: '스몰웨딩' },
];

const DEFAULT_CHECKLIST = [
  { title: '예산 전체 설정',       due_months_before: 12,   assigned_to: 'both' },
  { title: '웨딩홀 투어 리스트업', due_months_before: 12,   assigned_to: 'bride' },
  { title: '스드메 업체 조사',     due_months_before: 12,   assigned_to: 'bride' },
  { title: '웨딩홀 투어 실시',     due_months_before: 12,   assigned_to: 'both' },
  { title: '스드메 후보 3곳 선정', due_months_before: 12,   assigned_to: 'bride' },
  { title: '웨딩홀 계약',          due_months_before: 10,   assigned_to: 'both' },
  { title: '스드메 업체 최종 선정',due_months_before: 10,   assigned_to: 'bride' },
  { title: '청첩장 디자인 시작',   due_months_before: 8,    assigned_to: 'both' },
  { title: '스드메 계약',          due_months_before: 8,    assigned_to: 'bride' },
  { title: '신혼여행 예약',        due_months_before: 6,    assigned_to: 'both' },
  { title: '한복 맞춤',            due_months_before: 6,    assigned_to: 'bride' },
  { title: '청첩장 발송',          due_months_before: 3,    assigned_to: 'both' },
  { title: '예단/예물 준비',       due_months_before: 3,    assigned_to: 'both' },
  { title: '최종 드레스 피팅',     due_months_before: 1,    assigned_to: 'bride' },
  { title: '좌석 배치 확정',       due_months_before: 1,    assigned_to: 'both' },
  { title: '업체 최종 확인',       due_months_before: 0.25, assigned_to: 'both' },
];

const DEFAULT_DECISIONS = [
  { title: '웨딩 컨셉' },
  { title: '하객 규모' },
  { title: '신혼여행지' },
  { title: '주례 여부' },
  { title: '폐백 여부' },
  { title: '혼수 분담 방식' },
  { title: '신혼집 지역' },
  { title: '상견례 장소/방식' },
];

export default function SetupPage() {
  const router = useRouter();
  const [weddingDate, setWeddingDate] = useState('');
  const [weddingType, setWeddingType] = useState('hall');
  const [budget, setBudget] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupleId, setCoupleId] = useState(null);

  useEffect(() => {
    const getCoupleId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();
      if (user?.couple_id) setCoupleId(user.couple_id);
    };
    getCoupleId();
  }, []);

  async function handleSave() {
    setError('');
    if (!weddingDate) { setError('결혼식 날짜를 입력해주세요.'); return; }
    if (!coupleId) { setError('커플 연동이 필요해요.'); return; }
    setLoading(true);

    // couples 업데이트
    const { error: updateError } = await supabase
      .from('couples')
      .update({
        wedding_date: weddingDate,
        wedding_type: weddingType,
        total_budget: budget ? parseInt(budget, 10) : null,
        wedding_region: region.trim() || null,
      })
      .eq('id', coupleId);

    if (updateError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    // 기본 체크리스트 생성
    const checklistRows = DEFAULT_CHECKLIST.map((item) => ({
      couple_id: coupleId,
      title: item.title,
      due_months_before: item.due_months_before,
      assigned_to: item.assigned_to,
      is_done: false,
    }));
    await supabase.from('checklist_items').insert(checklistRows);

    // 기본 의사결정 생성
    const decisionRows = DEFAULT_DECISIONS.map((d) => ({
      couple_id: coupleId,
      title: d.title,
      status: 'undiscussed',
    }));
    await supabase.from('decisions').insert(decisionRows);

    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          결혼 준비 시작하기 🎊
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          기본 정보를 입력하면 체크리스트가 자동으로 만들어져요
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* 결혼식 날짜 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            결혼식 날짜
          </label>
          <input
            className="input-field"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
        </div>

        {/* 예식 형태 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            예식 형태
          </label>
          <div className="grid grid-cols-4 gap-2">
            {WEDDING_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setWeddingType(t.value)}
                className="py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: weddingType === t.value ? 'var(--rose)' : 'white',
                  color: weddingType === t.value ? 'white' : 'var(--stone)',
                  border: `1.5px solid ${weddingType === t.value ? 'var(--rose)' : 'var(--stone-light)'}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 총 예산 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            총 예산 (만원)
          </label>
          <input
            className="input-field"
            type="number"
            placeholder="예: 5000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>

        {/* 예식 지역 */}
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            예식 지역
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="예: 서울 강남"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--rose)' }}>
            {error}
          </p>
        )}

        <button
          className="btn-rose w-full mt-2"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '저장 중...' : '저장하고 시작하기 🎉'}
        </button>
      </div>
    </div>
  );
}
