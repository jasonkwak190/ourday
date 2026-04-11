'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const ASSIGNED_LABELS = {
  groom: { label: '신랑', cls: 'tag-stone' },
  bride: { label: '신부', cls: 'tag-rose' },
  both:  { label: '둘다', cls: 'tag-green' },
};

function calcDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getCurrentMonthItems(items, weddingDate) {
  if (!weddingDate || !items.length) return [];
  const today = new Date();
  const wedding = new Date(weddingDate);
  const monthsDiff = (wedding - today) / (1000 * 60 * 60 * 24 * 30);

  return items.filter((item) => {
    const itemMonth = item.due_months_before;
    return itemMonth >= monthsDiff - 0.5 && itemMonth <= monthsDiff + 1.5;
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState(null);
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', session.user.id)
        .single();

      if (!user?.couple_id) {
        // 커플 미연동 상태 - 대시보드는 그냥 보여줌
        setLoading(false);
        return;
      }

      const cId = user.couple_id;

      const [coupleRes, itemsRes, decisionsRes, budgetRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', cId).single(),
        supabase.from('checklist_items').select('*').eq('couple_id', cId),
        supabase.from('decisions').select('id, status').eq('couple_id', cId),
        supabase.from('budget_items').select('estimated_amount, actual_amount').eq('couple_id', cId),
      ]);

      if (coupleRes.error) { setError('데이터를 불러오지 못했어요.'); }
      else {
        setCouple(coupleRes.data);
        setItems(itemsRes.data || []);
        setDecisions(decisionsRes.data || []);
        setBudgetItems(budgetRes.data || []);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  async function toggleItem(id, current) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, is_done: !current } : it))
    );
    await supabase
      .from('checklist_items')
      .update({ is_done: !current })
      .eq('id', id);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--stone)' }}>
          <div className="text-3xl mb-2">💍</div>
          <p className="text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--rose)' }}>{error}</p>
      </div>
    );
  }

  const dday = calcDday(couple?.wedding_date);
  const thisMonthItems = getCurrentMonthItems(items, couple?.wedding_date);
  const monthDoneCount = thisMonthItems.filter((i) => i.is_done).length;
  const monthTotalCount = thisMonthItems.length;

  const totalDoneCount = items.filter((i) => i.is_done).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((totalDoneCount / totalCount) * 100) : 0;
  const undecidedCount = decisions.filter((d) => d.status !== 'decided').length;

  const totalBudget = couple?.total_budget || 0;
  const totalSpent = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const weddingDateFormatted = couple?.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // 커플 미연동 상태 - 설정 안내 화면
  if (!couple) {
    return (
      <div className="page-wrapper flex flex-col">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => router.push('/settings')}
            className="text-xl"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="설정"
          >
            ⚙️
          </button>
        </div>

        <div className="text-center mt-12 mb-8">
          <div className="text-5xl mb-4">💍</div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            결혼 준비를 시작해볼까요?
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            정보를 설정하면 더 많은 기능을 쓸 수 있어요
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            className="btn-rose w-full"
            onClick={() => router.push('/setup')}
          >
            결혼 정보 설정하기
          </button>
          <button
            className="btn-outline w-full"
            onClick={() => router.push('/connect')}
          >
            커플 연동하기 💑
          </button>
        </div>

        <BottomNav active="home" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* 상단 설정 버튼 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => router.push('/settings')}
          className="text-xl"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="설정"
        >
          ⚙️
        </button>
      </div>

      {/* D-day 헤더 */}
      <div className="text-center mb-6">
        <p className="text-sm mb-1" style={{ color: 'var(--stone)' }}>
          {weddingDateFormatted || '결혼 날짜를 설정해주세요'}
        </p>
        {dday !== null && (
          <div>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)' }}
            >
              {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${Math.abs(dday)}`}
            </span>
            <p
              className="text-7xl font-bold mt-2 leading-none"
              style={{
                fontFamily: 'var(--font-dm-serif)',
                fontStyle: 'italic',
                color: 'var(--rose)',
              }}
            >
              {dday > 0 ? dday : dday === 0 ? '🎊' : Math.abs(dday)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              {dday > 0 ? '일 남았어요' : dday === 0 ? '오늘이에요!' : '일 지났어요'}
            </p>
          </div>
        )}
      </div>

      {/* 스탯 카드 3개 */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="card text-center py-4">
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-dm-serif)' }}
          >
            {monthDoneCount}<span className="text-base font-normal" style={{ color: 'var(--stone)' }}>/{monthTotalCount}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>이번달 완료</p>
        </div>
        <div className="card text-center py-4">
          <p
            className="text-2xl font-bold"
            style={{ color: budgetPct > 100 ? 'var(--rose)' : 'var(--ink)', fontFamily: 'var(--font-dm-serif)' }}
          >
            {budgetPct}<span className="text-base font-normal" style={{ color: 'var(--stone)' }}>%</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>예산 사용</p>
        </div>
        <div className="card text-center py-4">
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--amber)', fontFamily: 'var(--font-dm-serif)' }}
          >
            {undecidedCount}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>미결정</p>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>전체 진행률</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--rose)' }}>{progress}%</p>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 이번 달 할 일 */}
      <div className="card">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          이번 달 할 일
          <span
            className="ml-2 text-xs font-normal"
            style={{ color: 'var(--stone)' }}
          >
            ({thisMonthItems.filter((i) => i.is_done).length}/{thisMonthItems.length})
          </span>
        </p>

        {thisMonthItems.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--stone)' }}>
            이번 달 할 일이 없어요 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {thisMonthItems.map((item) => {
              const tag = ASSIGNED_LABELS[item.assigned_to] || ASSIGNED_LABELS.both;
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItem(item.id, item.is_done)}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={{
                      border: `2px solid ${item.is_done ? 'var(--rose)' : 'var(--stone-light)'}`,
                      backgroundColor: item.is_done ? 'var(--rose)' : 'transparent',
                    }}
                  >
                    {item.is_done && <span className="text-white text-xs">✓</span>}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.is_done ? 'var(--stone)' : 'var(--ink)',
                      textDecoration: item.is_done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </span>
                  <span className={`tag ${tag.cls}`}>{tag.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
