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
  { title: '예산 전체 설정',        due_months_before: 12,   assigned_to: 'both' },
  { title: '웨딩홀 투어 리스트업',  due_months_before: 12,   assigned_to: 'bride' },
  { title: '스드메 업체 조사',      due_months_before: 12,   assigned_to: 'bride' },
  { title: '웨딩홀 투어 실시',      due_months_before: 12,   assigned_to: 'both' },
  { title: '스드메 후보 3곳 선정',  due_months_before: 12,   assigned_to: 'bride' },
  { title: '웨딩홀 계약',           due_months_before: 10,   assigned_to: 'both' },
  { title: '스드메 업체 최종 선정', due_months_before: 10,   assigned_to: 'bride' },
  { title: '청첩장 디자인 시작',    due_months_before: 8,    assigned_to: 'both' },
  { title: '스드메 계약',           due_months_before: 8,    assigned_to: 'bride' },
  { title: '신혼여행 예약',         due_months_before: 6,    assigned_to: 'both' },
  { title: '한복 맞춤',             due_months_before: 6,    assigned_to: 'bride' },
  { title: '청첩장 발송',           due_months_before: 3,    assigned_to: 'both' },
  { title: '예단/예물 준비',        due_months_before: 3,    assigned_to: 'both' },
  { title: '최종 드레스 피팅',      due_months_before: 1,    assigned_to: 'bride' },
  { title: '좌석 배치 확정',        due_months_before: 1,    assigned_to: 'both' },
  { title: '업체 최종 확인',        due_months_before: 0.25, assigned_to: 'both' },
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

function generateInviteCode() {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

export default function SetupPage() {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [weddingDate, setWeddingDate] = useState('');
  const [weddingType, setWeddingType] = useState('hall');
  const [budget, setBudget] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [coupleId, setCoupleId] = useState(null);
  const [isEdit, setIsEdit] = useState(false); // 수정 모드 여부

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      setUserId(session.user.id);

      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();

      if (user?.couple_id) {
        setCoupleId(user.couple_id);

        // 기존 설정값 불러오기
        const { data: couple } = await supabase
          .from('couples')
          .select('*')
          .eq('id', user.couple_id)
          .single();

        if (couple) {
          if (couple.wedding_date) setWeddingDate(couple.wedding_date);
          if (couple.wedding_type) setWeddingType(couple.wedding_type);
          if (couple.total_budget) setBudget(String(couple.total_budget));
          if (couple.wedding_region) setRegion(couple.wedding_region);
          // 이미 설정된 값이 있으면 수정 모드
          if (couple.wedding_date) setIsEdit(true);
        }
      }

      setPageLoading(false);
    };
    load();
  }, [router]);

  async function handleSave() {
    setError('');
    setSaving(true);

    let cId = coupleId;

    // couple_id 없으면 새로 생성
    if (!cId) {
      const code = generateInviteCode();
      const { data: newCouple, error: createError } = await supabase
        .from('couples')
        .insert({ invite_code: code })
        .select()
        .single();

      if (createError) {
        setError('저장에 실패했어요. 다시 시도해주세요.');
        setSaving(false);
        return;
      }

      await supabase
        .from('users')
        .update({ couple_id: newCouple.id })
        .eq('id', userId);

      cId = newCouple.id;
      setCoupleId(cId);
    }

    // 결혼 정보 업데이트
    const { error: updateError } = await supabase
      .from('couples')
      .update({
        wedding_date: weddingDate || null,
        wedding_type: weddingType,
        total_budget: budget ? parseInt(budget, 10) : null,
        wedding_region: region.trim() || null,
      })
      .eq('id', cId);

    if (updateError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      setSaving(false);
      return;
    }

    // 기본 체크리스트/의사결정은 처음 한 번만 생성 (수정 모드면 스킵)
    if (!isEdit) {
      const { count } = await supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', cId);

      if (count === 0) {
        await supabase.from('checklist_items').insert(
          DEFAULT_CHECKLIST.map((item) => ({
            couple_id: cId,
            title: item.title,
            due_months_before: item.due_months_before,
            assigned_to: item.assigned_to,
            is_done: false,
          }))
        );
        await supabase.from('decisions').insert(
          DEFAULT_DECISIONS.map((d) => ({
            couple_id: cId,
            title: d.title,
            status: 'undiscussed',
          }))
        );
      }
    }

    setSaving(false);
    router.push('/dashboard');
  }

  if (pageLoading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          {isEdit ? '결혼 정보 수정 ✏️' : '결혼 준비 시작하기 🎊'}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {isEdit
            ? '언제든 수정할 수 있어요'
            : '나중에 설정해도 괜찮아요. 언제든 수정할 수 있어요'}
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
          disabled={saving}
        >
          {saving ? '저장 중...' : isEdit ? '수정 완료' : '저장하고 시작하기 🎉'}
        </button>

        {/* 스킵 버튼 (수정 모드가 아닐 때만) */}
        {!isEdit && (
          <button
            className="text-sm text-center"
            style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => router.push('/dashboard')}
          >
            나중에 설정할게요 →
          </button>
        )}
      </div>
    </div>
  );
}
